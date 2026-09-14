import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../constants/app_constants.dart';

/// Helper sentral untuk `google_sign_in` 7.x.
///
/// `GoogleSignIn.instance.initialize()` hanya boleh dipanggil SEKALI per sesi
/// aplikasi (dokumentasi resmi: pemanggilan lebih dari sekali = undefined
/// behavior, bisa melempar error yang terlihat seperti "tidak terkonfigurasi").
///
/// Sebelumnya `login_page.dart` dan `register_page.dart` masing-masing punya
/// flag `_googleInitialized` sendiri, sehingga navigasi Login -> Daftar dalam
/// satu sesi memanggil `initialize()` dua kali. Helper ini memakai flag
/// static global agar aman dipanggil dari halaman mana pun.
///
/// - Android: plugin TIDAK memakai `clientId` — aplikasi dikenali dari
///   package name (`com.traceralumni.app`) + SHA-1 signing key yang terdaftar
///   sebagai OAuth client type "Android" di Google Cloud Console / Firebase.
/// - `serverClientId` wajib = client OAuth **Web**, HARUS sama persis dengan
///   `GOOGLE_CLIENT_ID` backend agar ID token lolos verifikasi audience.
class GoogleSignInService {
  GoogleSignInService._();

  static bool _initialized = false;
  static Future<void>? _initFuture;

  /// Pastikan `GoogleSignIn` terinisialisasi (idempoten, aman concurrent).
  static Future<void> ensureInitialized() {
    if (_initialized) return Future.value();
    _initFuture ??= _doInitialize().then((_) => _initialized = true);
    return _initFuture!;
  }

  static Future<void> _doInitialize() async {
    String? clientId;
    if (kIsWeb) {
      clientId = AppConstants.googleClientId;
    } else if (Platform.isIOS || Platform.isMacOS) {
      const iosId = AppConstants.googleIosClientId;
      clientId = iosId.isNotEmpty ? iosId : null;
    }
    await GoogleSignIn.instance.initialize(
      clientId: clientId,
      serverClientId: AppConstants.googleClientId,
    );
  }

  /// Minta ID token Google (selalu tampilkan pemilih akun).
  ///
  /// Melempar [GoogleSignInException] bila tidak mendapat ID token —
  /// caller mengubahnya menjadi pesan yang ramah untuk user.
  static Future<String> requestIdToken() async {
    await ensureInitialized();
    final googleSignIn = GoogleSignIn.instance;
    await googleSignIn.signOut();
    final account = await googleSignIn.authenticate();
    final idToken = account.authentication.idToken;
    if (idToken == null || idToken.isEmpty) {
      throw const GoogleSignInException(
        code: GoogleSignInExceptionCode.unknownError,
        description: 'Tidak mendapat ID token dari Google',
      );
    }
    return idToken;
  }

  /// Ambil klaim `aud` dari JWT TANPA verifikasi signature.
  ///
  /// Hanya untuk log diagnosis (mis. memastikan audience token = Web client ID
  /// yang sama dengan `GOOGLE_CLIENT_ID` backend). Tidak untuk autentikasi.
  static String? tokenAudience(String jwt) {
    try {
      final parts = jwt.split('.');
      if (parts.length != 3 || parts[1].isEmpty) return null;
      var payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      payload += '=' * ((4 - payload.length % 4) % 4);
      final json = jsonDecode(utf8.decode(base64.decode(payload)));
      if (json is! Map) return null;
      final aud = json['aud'];
      return aud?.toString();
    } catch (_) {
      return null;
    }
  }

  /// Ubah [GoogleSignInException] menjadi pesan Indonesia yang actionable.
  ///
  /// Error konfigurasi (code 28444 / "Developer console is not set up
  /// correctly") hampir selalu berarti: package name + SHA-1 debug/release
  /// belum terdaftar sebagai OAuth client Android di project Firebase
  /// `traceralumni-51243`, atau `google-services.json` tidak cocok.
  static String friendlyErrorMessage(GoogleSignInException e) {
    if (e.code == GoogleSignInExceptionCode.canceled) return '';
    final desc = e.description ?? '';
    final isConfigError = desc.contains('Developer console') ||
        desc.contains('clientId') ||
        desc.contains('sign_in') ||
        desc.contains('28444');
    if (isConfigError) {
      return 'Google Sign-In belum terkonfigurasi. Periksa: '
          '(1) SHA-1 debug + package name com.traceralumni.app '
          'terdaftar sebagai OAuth client type Android di Firebase Console '
          '(Project traceralumni-51243), lalu download ulang google-services.json, dan '
          '(2) nilai GOOGLE_CLIENT_ID mobile sama persis dengan GOOGLE_CLIENT_ID backend.';
    }
    return 'Google Sign-In gagal: ${desc.isNotEmpty ? desc : 'periksa konfigurasi client ID Google'}. '
        'Pastikan backend berjalan dan akun sudah terdaftar.';
  }
}
