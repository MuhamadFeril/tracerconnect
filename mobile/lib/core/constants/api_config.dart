const String _productionHost = 'https://tracceralumni.freehosting.dev';

/// Resolve the API base URL at runtime.
///
/// Priority:
/// 1. `--dart-define=API_BASE_URL=...` (explicit override — production / WiFi)
/// 2. Platform-specific defaults (Android → 127.0.0.1 via adb reverse, iOS → localhost)
Future<String> resolveApiBaseUrl() async {
  // 1. Explicit override via --dart-define (highest priority)
  const defined = String.fromEnvironment('API_BASE_URL');
  if (defined.isNotEmpty) return defined;

  // 2. Production server (default)
  return '$_productionHost/api/v1';
}

/// Resolve the API origin (without `/api/v1`) for asset URLs.
Future<String> resolveApiOrigin() async {
  final base = await resolveApiBaseUrl();
  return base.replaceAll(RegExp(r'/api/v1$'), '');
}
