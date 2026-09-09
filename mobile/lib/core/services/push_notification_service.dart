import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';

const _androidChannelId = 'tracerconnect_default';
const _androidChannelName = 'TracerAlumni Notifications';
const _androidChannelDesc = 'Notifikasi dari TracerAlumni';

/// Top-level handler — must be a top-level function (not a closure).
/// Firebase calls this when a message arrives while the app is in the
/// background or terminated.
///
/// On Android, when the FCM message contains a `notification` payload,
/// the system automatically displays it in the tray — no local
/// notification needed here.  This handler exists for data processing
/// and as a safety net for data-only messages.
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

  /// Callback untuk navigasi saat user tap notification.
  /// Dipasang dari main.dart setelah GoRouter tersedia.
  void Function(String url)? _onNavigate;

  /// Menyimpan initial message jika arrived sebelum callback terpasang.
  RemoteMessage? _pendingInitialMessage;

  /// Cached FCM token — stored so registerToken() can retry sending it
  /// to the backend even if the first attempt failed (auth not ready yet).
  String? _cachedToken;

  /// Initialize FCM.  Safe to call even when Firebase is not configured.
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    try {
      // Firebase.initializeApp() will throw if google-services.json is
      // missing — catch it early so the rest of the app is unaffected.
      await Firebase.initializeApp();
      _firebaseReady = true;
      debugPrint('FCM: Firebase initialized successfully');
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
      // Create the notification channel explicitly (Android 8+ / API 26+).
      // While flutter_local_notifications may create a default channel via
      // initialize(), we create ours explicitly to guarantee the channel
      // exists with the correct importance BEFORE any notification is shown.
      final android = FlutterLocalNotificationsPlugin()
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();
      await android?.createNotificationChannel(
        const AndroidNotificationChannel(
          _androidChannelId,
          _androidChannelName,
          description: _androidChannelDesc,
          importance: Importance.high,
        ),
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
        onDidReceiveNotificationResponse: (details) {
          // Handle tap pada local notification (foreground message).
          final url = details.payload;
          debugPrint('Local notification tap: $url');
          if (url != null && url.isNotEmpty && _onNavigate != null) {
            _onNavigate!(url);
          }
        },
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

    // Handle notification tap when app was terminated.
    // Harus dipanggil SEKALI dan diberikan timeout agar tidak blocking.
    try {
      final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
      if (initialMessage != null) {
        // Jika callback belum terpasang, simpan dulu.
        if (_onNavigate != null) {
          _handleNotificationTap(initialMessage);
        } else {
          _pendingInitialMessage = initialMessage;
        }
      }
    } catch (_) {}

    // Cache the FCM token locally.  The actual backend registration is done
    // by registerToken() which is called AFTER the user is authenticated
    // (from AuthController._setAuthenticated).  This avoids the race
    // condition where init() tries to POST /notifications/fcm-token
    // before the Authorization header is available (always 401).
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        _cachedToken = token;
        debugPrint('FCM token cached: ${token.substring(0, 12)}…');
      }

      // Listen for token refreshes and cache the new value.
      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
        _cachedToken = newToken;
        debugPrint('FCM token refreshed: ${newToken.substring(0, 12)}…');
        // Re-register with backend (auth should be active by now).
        _registerToken(newToken);
      });
    } catch (e) {
      debugPrint('FCM token fetch failed: $e');
    }
  }

  /// (Re)register the device token with the backend.  Called from
  /// AuthController._setAuthenticated() AFTER the user is logged in
  /// and ApiClient has a valid Bearer token.
  Future<void> registerToken() async {
    if (!_firebaseReady) {
      debugPrint('FCM: registerToken skipped — Firebase not ready');
      return;
    }

    // If we already have a cached token, send it immediately.
    if (_cachedToken != null && _cachedToken!.isNotEmpty) {
      debugPrint('FCM: registerToken using cached token');
      await _registerToken(_cachedToken!);
      return;
    }

    // Otherwise fetch a fresh token and send it.
    try {
      debugPrint('FCM: registerToken fetching fresh token');
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        _cachedToken = token;
        await _registerToken(token);
      } else {
        debugPrint('FCM: registerToken getToken returned null/empty');
      }
    } catch (e) {
      debugPrint('FCM: registerToken failed: $e');
    }
  }

  /// Pasang callback navigasi dari main.dart.
  /// Panggil SETELAH runApp() agar GoRouter sudah siap.
  void setNavigationCallback(void Function(String url) onNavigate) {
    _onNavigate = onNavigate;

    // Jika ada initial message yang arrived sebelum callback terpasang,
    // sekarang saatnya proses navigasinya.
    if (_pendingInitialMessage != null) {
      _handleNotificationTap(_pendingInitialMessage!);
      _pendingInitialMessage = null;
    }
  }

  /// Send the token to the backend so the server can push notifications.
  Future<void> _registerToken(String token) async {
    final platform = Platform.isAndroid ? 'android' : 'ios';
    for (var attempt = 0; attempt < 3; attempt++) {
      try {
        debugPrint('FCM: registering token (${token.substring(0, 12)}…) platform=$platform (attempt ${attempt + 1}/3)');
        final result = await ApiClient.instance.post('/notifications/fcm-token', data: {
          'token': token,
          'platform': platform,
        });
        debugPrint('FCM: token registered successfully, result=$result');
        return;
      } catch (e, stack) {
        debugPrint('FCM: token registration FAILED (attempt ${attempt + 1}/3): $e');
        if (attempt == 2) {
          debugPrint('FCM: stack trace: $stack');
          return;
        }
        await Future.delayed(Duration(seconds: attempt + 1));
      }
    }
  }

  /// Display a local notification when a message arrives in the foreground.
  void _handleForegroundMessage(RemoteMessage message) {
    try {
      final notification = message.notification;
      if (notification == null) return;

      final localNotifications = FlutterLocalNotificationsPlugin();
      final url = message.data['url'] as String?;

      const details = NotificationDetails(
        android: AndroidNotificationDetails(
          _androidChannelId,
          _androidChannelName,
          channelDescription: _androidChannelDesc,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
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
        payload: url,
      );
    } catch (_) {}
  }

  /// Handle notification tap (app opened from background).
  void _handleNotificationTap(RemoteMessage message) {
    try {
      final url = message.data['url'] as String?;
      debugPrint('FCM notification tap: $url');
      if (url != null && url.isNotEmpty && _onNavigate != null) {
        _onNavigate!(url);
      }
    } catch (_) {}
  }

  /// Delete the FCM token from the backend (called on logout).
  Future<void> removeToken() async {
    if (!_firebaseReady) return;
    try {
      // Use the cached token if available; fall back to fetching a fresh one.
      final token = _cachedToken ?? await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await ApiClient.instance
            .delete('/notifications/fcm-token', data: {'token': token});
        _cachedToken = null;
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
