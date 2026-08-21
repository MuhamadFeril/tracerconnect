import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;
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
  static const Duration _operationTimeout = Duration(seconds: 5);

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  String? _cachedToken;
  bool _storageAvailable = true;

  String? get cachedToken => _cachedToken;

  Future<String?> readToken() async {
    if (_cachedToken != null) return _cachedToken;
    if (!_storageAvailable) return null;

    try {
      _cachedToken = await _storage.read(key: _tokenKey).timeout(_operationTimeout);
      return _cachedToken;
    } catch (_) {
      // Secure storage tidak tersedia / gagal: lanjut tanpa token daripada
      // membiarkan splash berputar selamanya.
      _storageAvailable = false;
      return null;
    }
  }

  Future<void> saveToken(String token) async {
    _cachedToken = token;
    if (!_storageAvailable) return;

    try {
      await _storage.write(key: _tokenKey, value: token).timeout(_operationTimeout);
    } catch (_) {
      _storageAvailable = false;
    }
  }

  Future<void> clear() async {
    _cachedToken = null;
    if (!_storageAvailable) return;

    try {
      await _storage.delete(key: _tokenKey).timeout(_operationTimeout);
    } catch (_) {
      _storageAvailable = false;
    }
  }
}
