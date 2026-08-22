import 'dart:io';

import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../core/storage/token_storage.dart';
import '../../models/user.dart';

/// Hasil login/register: token + user.
class AuthSession {
  final String token;
  final User user;

  const AuthSession({required this.token, required this.user});
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
  Future<AuthSession> googleLogin(String idToken) async {
    final data = await _api.post('/auth/google', data: {'id_token': idToken});
    return _sessionFromData(data);
  }

  /// Tukar authorization code (dari Google OAuth redirect) dengan token.
  Future<String> exchangeGoogleAuthCode(String authCode) async {
    final data = await _api.post('/auth/google/exchange', data: {'auth_code': authCode});
    final map = data as Map<String, dynamic>;
    return map['token'] as String;
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

  /// Kirim ulang OTP registrasi.
  Future<void> resendOtp(String email) async {
    await _api.post(
      '/auth/resend-otp',
      data: {'email': email.trim(), 'purpose': 'register'},
    );
  }

  Future<AuthSession> _sessionFromData(dynamic data) async {
    final map = data as Map<String, dynamic>;
    final token = map['token'] as String;
    final user = User.fromJson(map['user'] as Map<String, dynamic>);
    ApiClient.setToken(token);
    await _storage.saveToken(token);
    return AuthSession(token: token, user: user);
  }

  Future<User> me() async {
    final data = await _api.get('/auth/me');
    return User.fromJson(data as Map<String, dynamic>);
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

  Future<void> resetPassword({
    required String email,
    required String token,
    required String password,
    required String passwordConfirmation,
  }) async {
    await _api.post('/auth/reset-password', data: {
      'email': email.trim(),
      'token': token.trim(),
      'password': password,
      'password_confirmation': passwordConfirmation,
    });
  }

  /// Update profil; mengembalikan User terbaru.
  Future<User> updateProfile(Map<String, dynamic> payload) async {
    final data = await _api.put('/auth/profile', data: payload);
    return User.fromJson(data as Map<String, dynamic>);
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
    return User.fromJson(data as Map<String, dynamic>);
  }

  Future<User> deleteAvatar() async {
    final data = await _api.delete('/auth/me/avatar');
    return User.fromJson(data as Map<String, dynamic>);
  }
}
