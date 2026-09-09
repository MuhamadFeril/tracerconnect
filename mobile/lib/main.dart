import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/constants/app_constants.dart';
import 'core/network/api_client.dart';
import 'core/router/app_router.dart';
import 'core/services/push_notification_service.dart';
import 'features/auth/auth_controller.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Resolve API base URL (auto-detect WiFi IP for real devices).
  await AppConstants.init();

  // Inisialisasi FCM SEBELUM runApp() agar token sudah siap saat
  // AuthController._restore() memanggil registerToken().  Error ditangani
  // secara internal — aplikasi tetap berjalan tanpa push notification
  // bila Firebase belum dikonfigurasi.
  await PushNotificationService.instance.init();

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

  // Pasang callback navigasi untuk notification tap.
  // Menggunakan addPostFrameCallback agar GoRouter sudah tersedia.
  WidgetsBinding.instance.addPostFrameCallback((_) {
    final router = container.read(routerProvider);
    PushNotificationService.instance.setNavigationCallback((url) {
      router.go(url);
    });
  });
}
