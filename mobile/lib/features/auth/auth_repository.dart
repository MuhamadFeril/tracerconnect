import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_error.dart';
import '../../core/storage/token_storage.dart';
import '../../models/user.dart';

/// Hasil login/register: token + user.
class AuthSession {
  final String token;
  final User user;

  const AuthSession({required this.token, required this.user});
}

/// Info pendaftaran Google yang belum selesai: dipakai untuk membawa
/// pengguna ke layar pelengkapan biodata (tanpa token API).
class GoogleRegistrationInfo {
  final String email;
  final String name;
  final String registrationToken;

  const GoogleRegistrationInfo({
    required this.email,
    required this.name,
    required this.registrationToken,
  });
}

/// Hasil `googleLogin`: bisa langsung login (akun sudah lengkap) atau butuh
/// pelengkapan biodata (akun Google baru).
class GoogleLoginResult {
  final AuthSession? session;
  final GoogleRegistrationInfo? registration;

  const GoogleLoginResult({this.session, this.registration});
}

/// Hasil register: bisa langsung login atau butuh verifikasi OTP.
class RegisterResult {
  /// `true` jika registrasi berhasil tapi akun belum aktif (butuh OTP).
  final bool requiresVerification;

  /// Email yang harus diverifikasi (ada saat [requiresVerification] true).
  final String? email;

  /// Sesi login langsung (ada jika backend langsung mengaktifkan akun).
  final AuthSession? session;

  const RegisterResult({
    required this.requiresVerification,
    this.email,
    this.session,
  });
}

class AuthRepository {
  final ApiClient _api = ApiClient.instance;
  final TokenStorage _storage = TokenStorage.instance;

  Future<String?> readToken() => _storage.readToken();

  Future<void> clearSession() => _storage.clear();

  Future<AuthSession> login(String email, String password) async {
    final data = await _api.post(
      '/auth/login',
      data: {'email': email.trim(), 'password': password},
    );
    return _sessionFromData(data);
  }

  /// Login dengan Google: kirim ID token ke `POST /auth/google` (sama seperti
  /// tombol Google di landing/login web).
  ///
  /// Login dengan Google. Akun Google baru (belum melengkapi biodata &
  /// OTP) mengembalikan [GoogleLoginResult.registration] TANPA token — alihkan
  /// ke layar pelengkapan biodata. Akun yang sudah lengkap mengembalikan
  /// [GoogleLoginResult.session] seperti login biasa.
  Future<GoogleLoginResult> googleLogin(String idToken) async {
    final data = await _api.post('/auth/google', data: {'id_token': idToken});

    // Akun Google baru → butuh pelengkapan biodata (tanpa token API).
    if (data is Map<String, dynamic> &&
        data['new_google_user'] == true &&
        (data['token'] == null || (data['token'] as String? ?? '').isEmpty)) {
      final regToken = data['registration_token'];
      if (regToken == null || (regToken as String? ?? '').isEmpty) {
        throw const ApiException(
          statusCode: null,
          message: 'Sesi registrasi Google tidak valid. Silakan coba lagi.',
        );
      }
      return GoogleLoginResult(
        registration: GoogleRegistrationInfo(
          email: (data['email'] as String? ?? '').toString(),
          name: (data['name'] as String? ?? '').toString(),
          registrationToken: regToken as String,
        ),
      );
    }

    return GoogleLoginResult(session: await _sessionFromData(data));
  }

  /// Selesaikan pendaftaran Google: simpan biodata institusi lalu backend
  /// akan mengirim OTP. Endpoint publik — diautentikasi via `registration_token`
  /// (server-signed, bukan Google ID token, agar tidak rapuh).
  Future<RegisterResult> completeGoogleRegistration(
    String registrationToken,
    Map<String, dynamic> payload,
  ) async {
    final data = await _api.post(
      '/auth/google/complete-registration',
      data: {...payload, 'registration_token': registrationToken},
    );
    final map = data as Map<String, dynamic>;

    if (map['requires_verification'] == true) {
      return RegisterResult(
        requiresVerification: true,
        email: map['email'] as String?,
      );
    }

    return RegisterResult(
      requiresVerification: false,
      session: await _sessionFromData(data),
    );
  }

  /// Tukar authorization code (dari Google OAuth redirect) dengan token.
  Future<String> exchangeGoogleAuthCode(String authCode) async {
    final data = await _api.post('/auth/google/exchange', data: {'auth_code': authCode});
    final map = data as Map<String, dynamic>;
    final token = map['token'] as String?;
    if (token == null || token.isEmpty) {
      throw const ApiException(
        statusCode: null,
        message: 'Token tidak diterima dari server.',
      );
    }
    return token;
  }

  /// Register akun baru. Backend mengembalikan `requires_verification`
  /// karena akun harus diverifikasi via OTP sebelum bisa login.
  Future<RegisterResult> register(Map<String, dynamic> payload) async {
    final data = await _api.post('/auth/register', data: payload);
    final map = data as Map<String, dynamic>;

    // Backend selalu mengembalikan { requires_verification, email }.
    final requiresVerification = map['requires_verification'] == true;
    if (requiresVerification) {
      return RegisterResult(
        requiresVerification: true,
        email: map['email'] as String?,
      );
    }

    // Fallback: jika backend langsung login (kasus edge-case).
    return RegisterResult(
      requiresVerification: false,
      session: await _sessionFromData(data),
    );
  }

  /// Verifikasi OTP registrasi → mengembalikan sesi login.
  Future<AuthSession> verifyOtp(String email, String otp) async {
    final data = await _api.post(
      '/auth/verify-otp',
      data: {'email': email.trim(), 'otp': otp.trim()},
    );
    return _sessionFromData(data);
  }

  /// Kirim ulang OTP (`purpose`: `register` | `reset`) — paritas web.
  Future<void> resendOtp(String email, {String purpose = 'register'}) async {
    await _api.post(
      '/auth/resend-otp',
      data: {'email': email.trim(), 'purpose': purpose},
    );
  }

  /// Hapus akun yang sedang login. Backend melakukan soft-delete dan mencabut
  /// seluruh token. Lokal session harus dibersihkan oleh pemanggil setelahnya.
  Future<void> deleteAccount() async {
    await _api.delete('/auth/account');
  }

  Future<AuthSession> _sessionFromData(dynamic data) async {
    final map = data as Map<String, dynamic>;
    final token = map['token'] as String?;
    if (token == null || token.isEmpty) {
      throw const ApiException(
        statusCode: null,
        message: 'Token tidak diterima dari server.',
      );
    }
    final userJson = map['user'] as Map<String, dynamic>?;
    if (userJson == null) {
      throw const ApiException(
        statusCode: null,
        message: 'Data user tidak diterima dari server.',
      );
    }
    final user = User.fromJson(userJson);
    ApiClient.setToken(token);

    // Use the server's expires_in (seconds) for the local session TTL so
    // the mobile never outlives the Sanctum token. Falls back to the
    // default 30-day TTL when the server omits the field.
    final expiresInSec = map['expires_in'] as int?;
    final ttl = expiresInSec != null && expiresInSec > 0
        ? Duration(seconds: expiresInSec)
        : TokenStorage.sessionTtl;
    await _storage.saveSession(token, ttl: ttl);

    await _storage.cacheUser(jsonEncode(userJson));
    return AuthSession(token: token, user: user);
  }

  /// Profil user terakhir yang tersimpan lokal (untuk pemulihan sesi
  /// saat server tidak terjangkau).
  Future<User?> readCachedUser() async {
    try {
      final json = await _storage.loadCachedUser();
      if (json == null) return null;
      return User.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  /// Parse respons berisi user + simpan snapshot untuk pemulihan offline.
  Future<User> _userFromData(dynamic data) async {
    final json = data as Map<String, dynamic>;
    await _storage.cacheUser(jsonEncode(json));
    return User.fromJson(json);
  }

  Future<User> me() async {
    final data = await _api.get('/auth/me');
    return _userFromData(data);
  }

  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } catch (_) {
      // Best effort: token tetap dibersihkan lokal.
    }
  }

  Future<void> forgotPassword(String email) async {
    await _api.post('/auth/forgot-password', data: {'email': email.trim()});
  }

  /// Reset password via OTP email — paritas dengan web (`ResetPassword.tsx`):
  /// key yang dikirim adalah `otp` (bukan `token`), OTP harus 6 digit.
  Future<void> resetPassword({
    required String email,
    required String otp,
    required String password,
    required String passwordConfirmation,
  }) async {
    await _api.post('/auth/reset-password', data: {
      'email': email.trim(),
      'otp': otp.trim(),
      'password': password,
      'password_confirmation': passwordConfirmation,
    });
  }

  /// Update profil; mengembalikan User terbaru.
  Future<User> updateProfile(Map<String, dynamic> payload) async {
    final data = await _api.put('/auth/profile', data: payload);
    return _userFromData(data);
  }

  Future<void> updatePassword({
    required String currentPassword,
    required String newPassword,
    required String newPasswordConfirmation,
  }) async {
    await _api.put('/auth/password', data: {
      'current_password': currentPassword,
      'password': newPassword,
      'password_confirmation': newPasswordConfirmation,
    });
  }

  /// Kirim OTP ganti password ke email (tanpa password lama).
  Future<void> sendPasswordChangeOtp() async {
    await _api.post('/auth/password/otp');
  }

  /// Ganti password menggunakan OTP yang dikirim ke email.
  Future<void> changePasswordWithOtp({
    required String otp,
    required String newPassword,
    required String newPasswordConfirmation,
  }) async {
    await _api.put('/auth/password/otp', data: {
      'otp': otp,
      'password': newPassword,
      'password_confirmation': newPasswordConfirmation,
    });
  }

  /// Upload (atau ganti) foto profil.
  Future<User> uploadAvatar(File file) async {
    final form = FormData.fromMap({
      'avatar': await MultipartFile.fromFile(file.path, filename: file.uri.pathSegments.last),
    });
    final data = await _api.postForm('/auth/me/avatar', form);
    return _userFromData(data);
  }

  Future<User> deleteAvatar() async {
    final data = await _api.delete('/auth/me/avatar');
    // DELETE response may return null/empty data — fetch fresh user profile.
    if (data == null || (data is Map && data.isEmpty)) {
      return me();
    }
    return _userFromData(data);
  }
}
