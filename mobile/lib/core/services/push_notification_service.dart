import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';

/// Top-level handler — must be a top-level function (not a closure).
/// Firebase calls this when a message arrives while the app is in the
/// background or terminated.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('FCM background message: ${message.messageId}');
}

/// Manages Firebase Cloud Messaging token registration, foreground
/// message display, and local notification presentation.
///
/// Every public method is wrapped in a try-catch so the app never crashes
/// when `google-services.json` / `GoogleService-Info.plist` is missing or
/// when Firebase cannot be initialized.  Push notifications simply won't
/// work, but the rest of the app is unaffected.
class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  bool _initialized = false;
  bool _firebaseReady = false;

  /// Initialize FCM.  Safe to call even when Firebase is not configured.
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    try {
      // Firebase.initializeApp() will throw if google-services.json is
      // missing — catch it early so the rest of the app is unaffected.
      await Firebase.initializeApp();
      _firebaseReady = true;
    } catch (e) {
      // Firebase not configured (missing google-services.json, etc.).
      // The app continues to work — just without push notifications.
      debugPrint('Firebase init skipped (not configured): $e');
      return;
    }

    try {
      // Register background handler.
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    } catch (_) {}

    try {
      // Request permission (iOS / web). On Android it's granted by default.
      await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
    } catch (_) {}

    try {
      // Initialize local notifications for foreground display.
      const androidSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      );
      await FlutterLocalNotificationsPlugin().initialize(
        const InitializationSettings(
          android: androidSettings,
          iOS: iosSettings,
        ),
      );
    } catch (_) {}

    try {
      // Android 13+ memerlukan izin runtime untuk menampilkan notifikasi.
      final android = FlutterLocalNotificationsPlugin()
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();
      await android?.requestNotificationsPermission();
    } catch (_) {}

    try {
      // Listen for foreground messages.
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
      // Handle notification tap when app was in background.
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);
    } catch (_) {}

    // Get and send the FCM token to the backend.
    await _sendToken();
  }

  /// Send the current FCM token to the backend for push delivery.
  Future<void> _sendToken() async {
    if (!_firebaseReady) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        await _registerToken(token);
      }

      // Listen for token refreshes.
      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
        _registerToken(newToken);
      });
    } catch (e) {
      debugPrint('FCM token registration failed: $e');
    }
  }

  /// (Re)register the device token with the backend. Dipanggil setelah
  /// login berhasil / sesi dipulihkan — init() berjalan sebelum user login,
  /// jadi tanpa panggilan ini token tidak akan terdaftar untuk akun yang
  /// baru masuk (request 401 saat belum ada Authorization header).
  Future<void> registerToken() => _sendToken();

  /// Send the token to the backend so the server can push notifications.
  Future<void> _registerToken(String token) async {
    try {
      await ApiClient.instance.post('/notifications/fcm-token', data: {
        'token': token,
        'platform': Platform.isAndroid ? 'android' : 'ios',
      });
    } catch (e) {
      debugPrint('FCM token push to backend failed: $e');
    }
  }

  /// Display a local notification when a message arrives in the foreground.
  void _handleForegroundMessage(RemoteMessage message) {
    try {
      final notification = message.notification;
      if (notification == null) return;

      final localNotifications = FlutterLocalNotificationsPlugin();

      const androidDetails = AndroidNotificationDetails(
        'tracerconnect_default',
        'TracerAlumni Notifications',
        channelDescription: 'Notifikasi dari TracerAlumni',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
      );

      const details = NotificationDetails(
        android: androidDetails,
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      );

      localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        details,
      );
    } catch (_) {}
  }

  /// Handle notification tap (app opened from background).
  void _handleNotificationTap(RemoteMessage message) {
    try {
      final url = message.data['url'] as String?;
      debugPrint('FCM notification tap: $url');
    } catch (_) {}
  }

  /// Delete the FCM token from the backend (called on logout).
  Future<void> removeToken() async {
    if (!_firebaseReady) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await ApiClient.instance
            .delete('/notifications/fcm-token', data: {'token': token});
      }
    } catch (_) {
      // Best-effort cleanup.
    }
  }
}

/// Provider exposing the push notification service.
final pushNotificationServiceProvider = Provider<PushNotificationService>(
  (ref) => PushNotificationService.instance,
);
