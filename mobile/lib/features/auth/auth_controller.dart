import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_error.dart';
import '../../core/services/push_notification_service.dart';
import '../../core/storage/token_storage.dart';
import '../../models/user.dart';
import 'auth_repository.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final User? user;

  const AuthState._(this.status, this.user);

  static const unknown = AuthState._(AuthStatus.unknown, null);
  static const unauthenticated = AuthState._(AuthStatus.unauthenticated, null);

  const AuthState.authenticated(User user) : this._(AuthStatus.authenticated, user);

  bool get isAuthenticated => status == AuthStatus.authenticated;
}

final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository());

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>(
  (ref) => AuthController(ref.watch(authRepositoryProvider)),
);

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repo) : super(AuthState.unknown) {
    _restore();
  }

  final AuthRepository _repo;

  /// Pulihkan sesi dari token tersimpan (jika ada), lalu validasi via `/me`.
  ///
  /// Seluruh langkah di-guard (try/catch + timeout) sehingga status auth
  /// **selalu** keluar dari `unknown` — splash tidak akan pernah berputar
  /// selamanya meskipun secure storage bermasalah atau server tidak
  /// merespons.
  Future<void> _restore() async {
    String? token;
    try {
      token = await _repo.readToken();
    } catch (_) {
      token = null;
    }

    if (token == null || token.isEmpty) {
      state = AuthState.unauthenticated;
      return;
    }

    // Sesi bertahan 30 hari (TokenStorage.sessionTtl) — selama masih
    // dalam masa berlaku, buka ulang aplikasi TIDAK meminta login lagi.
    final valid = await TokenStorage.instance.isSessionValid();
    if (!valid) {
      await _clearLocalSession();
      state = AuthState.unauthenticated;
      return;
    }

    ApiClient.setToken(token);
    try {
      final user = await _repo.me().timeout(const Duration(seconds: 15));
      _setAuthenticated(user);
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        // Token basi: bersihkan agar tidak dipakai lagi.
        await _clearLocalSession();
        state = AuthState.unauthenticated;
        return;
      }
      // Error server lain: pakai profil cache bila ada, jangan usir user.
      final cached = await _repo.readCachedUser();
      state = cached != null
          ? AuthState.authenticated(cached)
          : AuthState.unauthenticated;
      if (cached != null) _registerPushToken();
    } catch (_) {
      // Timeout / koneksi gagal / parse error: tetap masuk aplikasi dengan
      // profil terakhir yang tersimpan sehingga user tidak diminta login
      // lagi hanya karena server sesaat tidak terjangkau.
      final cached = await _repo.readCachedUser();
      state = cached != null
          ? AuthState.authenticated(cached)
          : AuthState.unauthenticated;
      if (cached != null) _registerPushToken();
    }
  }

  /// Terapkan state authenticated + daftarkan token FCM perangkat ini ke
  /// backend (token API sudah tersedia saat sesi aktif).
  void _setAuthenticated(User user) {
    state = AuthState.authenticated(user);
    _registerPushToken();
  }

  /// Best-effort: daftarkan/segarkan token FCM untuk akun yang baru masuk.
  void _registerPushToken() {
    PushNotificationService.instance.registerToken();
  }

  Future<void> login(String email, String password) async {
    final session = await _repo.login(email, password);
    _setAuthenticated(session.user);
  }

  /// Login dengan Google menggunakan ID token dari `google_sign_in`.
  /// Mengembalikan [GoogleLoginResult] sehingga pemanggil dapat mengarahkan
  /// akun Google baru ke layar pelengkapan biodata (tanpa token).
  Future<GoogleLoginResult> googleLogin(String idToken) async {
    final result = await _repo.googleLogin(idToken);
    if (result.session != null) {
      _setAuthenticated(result.session!.user);
    }
    return result;
  }

  /// Selesaikan pendaftaran Google (pelengkapan biodata + OTP).
  Future<RegisterResult> completeGoogleRegistration(
    String registrationToken,
    Map<String, dynamic> payload,
  ) async {
    final result = await _repo.completeGoogleRegistration(
      registrationToken,
      payload,
    );
    if (result.session != null) {
      _setAuthenticated(result.session!.user);
    }
    return result;
  }

  Future<RegisterResult> register(Map<String, dynamic> payload) async {
    final result = await _repo.register(payload);
    if (result.session != null) {
      _setAuthenticated(result.session!.user);
    }
    return result;
  }

  /// Verifikasi OTP registrasi, lalu masuk.
  Future<void> verifyOtp(String email, String otp) async {
    final session = await _repo.verifyOtp(email, otp);
    _setAuthenticated(session.user);
  }

  /// Kirim ulang OTP registrasi.
  Future<void> resendOtp(String email) async {
    await _repo.resendOtp(email);
  }

  Future<void> logout() async {
    // Buang token push agar perangkat berhenti menerima notifikasi
    // setelah keluar (sebelum ApiClient kehilangan Authorization).
    await PushNotificationService.instance.removeToken();
    await _repo.logout();
    await _clearLocalSession();
    state = AuthState.unauthenticated;
  }

  /// Hapus akun permanen (soft-delete di server). Setelah berhasil, bersihkan
  /// sesi lokal dan kembalikan ke status unauthenticated.
  Future<void> deleteAccount() async {
    await PushNotificationService.instance.removeToken();
    await _repo.deleteAccount();
    await _clearLocalSession();
    state = AuthState.unauthenticated;
  }

  /// Dipanggil saat API menjawab 401 (token kedaluwarsa/dicabut).
  Future<void> forceLogout() async {
    await PushNotificationService.instance.removeToken();
    await _clearLocalSession();
    state = AuthState.unauthenticated;
  }

  Future<void> _clearLocalSession() async {
    try {
      await _repo.clearSession();
    } catch (_) {}
    ApiClient.setToken(null);
  }

  /// Perbarui user di state setelah update profil/avatar.
  /// Snapshot cache diperbarui otomatis oleh repository.
  void updateUser(User user) {
    state = AuthState.authenticated(user);
  }
}
