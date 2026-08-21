import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/api_envelope.dart';
import '../../models/notification_item.dart';
import 'notifications_repository.dart';

final notificationsRepositoryProvider =
    Provider<NotificationsRepository>((ref) => NotificationsRepository());

/// Halaman pertama notifikasi (dipakai beranda & halaman notifikasi).
final notificationsProvider =
    FutureProvider<Paged<NotificationItem>>((ref) async {
  return ref.watch(notificationsRepositoryProvider).list(page: 1, perPage: 15);
});

final unreadCountProvider =
    FutureProvider<int>((ref) => ref.watch(notificationsRepositoryProvider).unreadCount());
