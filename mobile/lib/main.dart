import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/constants/app_constants.dart';
import 'core/network/api_client.dart';
import 'core/services/push_notification_service.dart';
import 'features/auth/auth_controller.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Resolve API base URL (auto-detect WiFi IP for real devices).
  await AppConstants.init();

  final container = ProviderContainer();

  // Saat API menjawab 401 (token kedaluwarsa/dicabut), otomatis logout
  // dan arahkan kembali ke layar login via router.
  ApiClient.onUnauthorized = () {
    container.read(authControllerProvider.notifier).forceLogout();
  };

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const TracerConnectApp(),
    ),
  );

  // Inisialisasi push notification service (FCM) — dipanggil SETELAH
  // runApp() sehingga meskipun Firebase belum dikonfigurasi, aplikasi
  // tetap bisa menampilkan UI.  Error ditangani secara internal oleh
  // PushNotificationService.init().
  PushNotificationService.instance.init();
}
