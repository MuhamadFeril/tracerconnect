import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart' show kIsWeb;

import 'platform_stub.dart' if (dart.library.io) 'platform_native.dart' as platform;

/// Auto-detect the host machine's local IP address for WiFi development.
///
/// This tries common LAN IP patterns used by dev machines on WiFi.
/// Returns `null` if no local IP can be determined.
Future<String?> _detectLocalIp() async {
  try {
    final interfaces = await NetworkInterface.list(
      type: InternetAddressType.IPv4,
      includeLinkLocal: false,
    );
    for (final iface in interfaces) {
      for (final addr in iface.addresses) {
        final ip = addr.address;
        // Skip loopback (127.x.x.x) and Docker/bridge (172.17.x.x)
        if (ip.startsWith('127.')) continue;
        if (ip.startsWith('172.17.')) continue;
        // Return the first private IP found
        if (ip.startsWith('192.168.') ||
            ip.startsWith('10.') ||
            (ip.startsWith('172.') &&
                int.tryParse(ip.split('.')[1]) != null &&
                int.parse(ip.split('.')[1]) >= 16 &&
                int.parse(ip.split('.')[1]) <= 31)) {
          return ip;
        }
      }
    }
  } catch (_) {}
  return null;
}

/// Resolve the API base URL at runtime.
///
/// Priority:
/// 1. `--dart-define=API_BASE_URL=...` (explicit override)
/// 2. Auto-detected local WiFi IP (for real device development)
/// 3. Platform defaults (emulator: 10.0.2.2, web: localhost)
Future<String> resolveApiBaseUrl() async {
  // 1. Explicit override via --dart-define
  const defined = String.fromEnvironment('API_BASE_URL');
  if (defined.isNotEmpty) return defined;

  // 2. Auto-detect WiFi IP for real device
  if (!kIsWeb) {
    final localIp = await _detectLocalIp();
    if (localIp != null) {
      return 'http://$localIp:8000/api/v1';
    }
  }

  // 3. Platform defaults
  if (kIsWeb) return 'http://localhost:8000/api/v1';
  if (platform.isAndroid) return 'http://10.0.2.2:8000/api/v1';
  return 'http://127.0.0.1:8000/api/v1';
}

/// Resolve the API origin (without `/api/v1`) for asset URLs.
Future<String> resolveApiOrigin() async {
  final base = await resolveApiBaseUrl();
  return base.replaceAll(RegExp(r'/api/v1$'), '');
}
