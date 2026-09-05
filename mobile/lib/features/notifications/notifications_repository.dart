import '../../core/network/api_client.dart';
import '../../models/api_envelope.dart';
import '../../models/notification_item.dart';

class NotificationsRepository {
  final ApiClient _api = ApiClient.instance;

  Future<Paged<NotificationItem>> list({int page = 1, int perPage = 15}) async {
    final env = await _api.getEnvelope('/notifications', query: {
      'page': page,
      'per_page': perPage,
    });
    final items = (env.data as List?)
        ?.whereType<Map<String, dynamic>>()
        .map(NotificationItem.fromJson)
        .toList() ?? [];
    return Paged(
      items: items,
      meta: env.meta ??
          PaginationMeta(currentPage: 1, lastPage: 1, perPage: perPage, total: items.length),
    );
  }

  Future<int> unreadCount() async {
    final data = await _api.get('/notifications/unread-count');
    return (data as Map<String, dynamic>)['count'] as int? ?? 0;
  }

  Future<void> markRead(String id) async {
    await _api.post('/notifications/$id/read');
  }

  Future<void> markAllRead() async {
    await _api.post('/notifications/read-all');
  }
}
