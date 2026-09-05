import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Penyimpanan token otentikasi (Keychain iOS / Keystore Android).
///
/// Dirancang agar **tidak pernah menggantung aplikasi**: jika platform tidak
/// mendukung secure storage (mis. web tanpa plugin web, keystore bermasalah,
/// emulator baru), semua operasi di-catch dan aplikasi tetap jalan dengan
/// token di memori saja — sesi hanya hilang saat aplikasi ditutup.
class TokenStorage {
  TokenStorage._();

  static final TokenStorage instance = TokenStorage._();

  static const String _tokenKey = 'tc_auth_token';
  static const String _expiresAtKey = 'tc_session_expires_at';
  static const String _userKey = 'tc_cached_user';
  static const Duration _operationTimeout = Duration(seconds: 5);

  /// Sesi bertahan 30 hari sehingga menutup aplikasi TIDAK memaksa login
  /// ulang — token tetap dipulihkan saat aplikasi dibuka kembali.
  static const Duration sessionTtl = Duration(days: 30);

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  String? _cachedToken;
  DateTime? _cachedExpiresAt;
  String? _cachedUserJson;
  bool _storageAvailable = true;

  String? get cachedToken => _cachedToken;

  /// Waktu kedaluwarsa sesi (memori dulu, lalu storage).
  Future<DateTime?> readExpiresAt() async {
    if (_cachedExpiresAt != null) return _cachedExpiresAt;
    if (!_storageAvailable) return null;

    try {
      final raw =
          await _storage.read(key: _expiresAtKey).timeout(_operationTimeout);
      final millis = int.tryParse(raw ?? '');
      _cachedExpiresAt =
          millis == null ? null : DateTime.fromMillisecondsSinceEpoch(millis);
      return _cachedExpiresAt;
    } catch (_) {
      return null;
    }
  }

  /// `true` bila sesi masih berlaku (token ada dan belum melewati TTL).
  Future<bool> isSessionValid() async {
    final token = await readToken();
    if (token == null || token.isEmpty) return false;
    final expiresAt = await readExpiresAt();
    if (expiresAt == null) return true; // Tanpa catatan TTL: anggap berlaku.
    return DateTime.now().isBefore(expiresAt);
  }

  Future<String?> readToken() async {
    if (_cachedToken != null) return _cachedToken;
    if (!_storageAvailable) return null;

    try {
      _cachedToken = await _storage.read(key: _tokenKey).timeout(_operationTimeout);
      return _cachedToken;
    } catch (_) {
      // Secure storage tidak tersedia / gagal: lanjut tanpa token daripada
      // membiarkan splash berputar selamanya.
      return null;
    }
  }

  Future<void> saveToken(String token) => saveSession(token, ttl: sessionTtl);

  /// Simpan token + waktu kedaluwarsa (paritas dengan web:
  /// `tc_token` + `tc_session_expires_at`).
  Future<void> saveSession(String token, {required Duration ttl}) async {
    final expiresAt = DateTime.now().add(ttl);
    _cachedToken = token;
    _cachedExpiresAt = expiresAt;
    if (!_storageAvailable) return;

    try {
      await _storage.write(key: _tokenKey, value: token).timeout(_operationTimeout);
      await _storage
          .write(
              key: _expiresAtKey,
              value: expiresAt.millisecondsSinceEpoch.toString())
          .timeout(_operationTimeout);
    } catch (_) {
      // Keep in-memory state intact even if storage fails.
    }
  }

  Future<void> clear() async {
    _cachedToken = null;
    _cachedExpiresAt = null;
    _cachedUserJson = null;
    if (!_storageAvailable) return;

    try {
      await _storage.delete(key: _tokenKey).timeout(_operationTimeout);
      await _storage.delete(key: _expiresAtKey).timeout(_operationTimeout);
      await _storage.delete(key: _userKey).timeout(_operationTimeout);
    } catch (_) {
      // Best effort: in-memory state already cleared.
    }
  }

  /// Simpan snapshot profil user (JSON mentah dari API) untuk pemulihan
  /// sesi saat aplikasi dibuka tanpa koneksi server. Best-effort.
  Future<void> cacheUser(String json) async {
    _cachedUserJson = json;
    if (!_storageAvailable) return;

    try {
      await _storage.write(key: _userKey, value: json).timeout(_operationTimeout);
    } catch (_) {}
  }

  Map<String, dynamic>? _decodeCachedUser() {
    final raw = _cachedUserJson;
    if (raw == null) return null;
    try {
      final decoded = jsonDecode(raw);
      return decoded is Map<String, dynamic> ? decoded : null;
    } catch (_) {
      return null;
    }
  }

  /// Baca cache user dari memori dulu, lalu secure storage.
  Future<Map<String, dynamic>?> loadCachedUser() async {
    if (_cachedUserJson != null) return _decodeCachedUser();
    if (!_storageAvailable) return null;

    try {
      _cachedUserJson =
          await _storage.read(key: _userKey).timeout(_operationTimeout);
      return _decodeCachedUser();
    } catch (_) {
      return null;
    }
  }
}
