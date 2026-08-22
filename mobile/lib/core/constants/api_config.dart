import 'package:flutter/foundation.dart' show kIsWeb;

import 'platform_stub.dart' if (dart.library.io) 'platform_native.dart' as platform;

// ------------------------------------------------------------------
// Konfigurasi URL server
// ------------------------------------------------------------------
//
// Cara penggunaan:
//
// **Development (emulator Android — tanpa adb reverse):**
//   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
//
// **Development (perangkat fisik via USB / adb reverse):**
//   adb reverse tcp:8000 tcp:8000
//   flutter run  (otomatis pakai 127.0.0.1:8000)
//
// **Development (perangkat fisik via WiFi):**
//   flutter run --dart-define=API_BASE_URL=http://<IP_KOMPUTER>:8000/api/v1
//
// **Build APK production:**
//   flutter build apk --dart-define=API_BASE_URL=https://tracerconnect.example.com/api/v1
//
const String _localhost = '127.0.0.1';
const int _apiPort = 8000;

/// Resolve the API base URL at runtime.
///
/// Priority:
/// 1. `--dart-define=API_BASE_URL=...` (explicit override — production / WiFi)
/// 2. Platform-specific defaults (Android → 127.0.0.1 via adb reverse, iOS → localhost)
Future<String> resolveApiBaseUrl() async {
  // 1. Explicit override via --dart-define (highest priority)
  const defined = String.fromEnvironment('API_BASE_URL');
  if (defined.isNotEmpty) return defined;

  // 2. Platform-specific defaults.
  if (kIsWeb) return 'http://localhost:$_apiPort/api/v1';

  // Android (device fisik via USB / adb reverse → 127.0.0.1).
  // Untuk emulator tanpa adb reverse, gunakan --dart-define:
  //   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
  if (platform.isAndroid) return 'http://$_localhost:$_apiPort/api/v1';

  // iOS simulator / macOS desktop: localhost works directly.
  return 'http://$_localhost:$_apiPort/api/v1';
}

/// Resolve the API origin (without `/api/v1`) for asset URLs.
Future<String> resolveApiOrigin() async {
  final base = await resolveApiBaseUrl();
  return base.replaceAll(RegExp(r'/api/v1$'), '');
}
