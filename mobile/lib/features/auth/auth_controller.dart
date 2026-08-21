import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_error.dart';
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

    ApiClient.setToken(token);
    try {
      final user = await _repo.me().timeout(const Duration(seconds: 15));
      state = AuthState.authenticated(user);
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        // Token basi: bersihkan agar tidak dipakai lagi.
        try {
          await _repo.clearSession();
        } catch (_) {}
        ApiClient.setToken(null);
      }
      state = AuthState.unauthenticated;
    } catch (_) {
      // Timeout / koneksi gagal / parse error: jangan biarkan splash
      // menggantung — arahkan ke login. Token tetap tersimpan sehingga
      // sesi bisa dipulihkan saat server sudah terjangkau.
      state = AuthState.unauthenticated;
    }
  }

  Future<void> login(String email, String password) async {
    final session = await _repo.login(email, password);
    state = AuthState.authenticated(session.user);
  }

  /// Login dengan Google menggunakan ID token dari `google_sign_in`.
  Future<void> googleLogin(String idToken) async {
    final session = await _repo.googleLogin(idToken);
    state = AuthState.authenticated(session.user);
  }

  Future<void> register(Map<String, dynamic> payload) async {
    final session = await _repo.register(payload);
    state = AuthState.authenticated(session.user);
  }

  Future<void> logout() async {
    await _repo.logout();
    await _repo.clearSession();
    ApiClient.setToken(null);
    state = AuthState.unauthenticated;
  }

  /// Dipanggil saat API menjawab 401 (token kedaluwarsa/dicabut).
  Future<void> forceLogout() async {
    await _repo.clearSession();
    ApiClient.setToken(null);
    state = AuthState.unauthenticated;
  }

  /// Perbarui user di state setelah update profil/avatar.
  void updateUser(User user) {
    state = AuthState.authenticated(user);
  }
}
