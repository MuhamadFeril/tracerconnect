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

  Future<AuthSession> register(Map<String, dynamic> payload) async {
    final data = await _api.post('/auth/register', data: payload);
    return _sessionFromData(data);
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
