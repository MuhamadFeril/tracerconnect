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

/// Jumlah notifikasi belum dibaca — polling tiap 10 detik, paritas
/// `useUnreadNotificationsCount()` di web (refetchInterval 10 dtk), sehingga
/// badge di beranda/notifikasi tetap segar selama aplikasi terbuka.
final unreadCountProvider = StreamProvider<int>((ref) async* {
  final repo = ref.watch(notificationsRepositoryProvider);
  yield await repo.unreadCount();
  await for (final _ in Stream<void>.periodic(const Duration(seconds: 10))) {
    try {
      yield await repo.unreadCount();
    } catch (_) {
      // Gagal satu siklus — pertahankan nilai terakhir.
    }
  }
});
