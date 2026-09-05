import '../../core/network/api_client.dart';
import '../../models/announcement.dart';
import '../../models/api_envelope.dart';

class AnnouncementsRepository {
  final ApiClient _api = ApiClient.instance;

  Future<Paged<Announcement>> list({int page = 1, int perPage = 15}) async {
    final env = await _api.getEnvelope('/announcements', query: {
      'page': page,
      'per_page': perPage,
    });
    final items = (env.data as List?)
        ?.whereType<Map<String, dynamic>>()
        .map(Announcement.fromJson)
        .toList() ?? [];
    return Paged(
      items: items,
      meta: env.meta ??
          PaginationMeta(currentPage: 1, lastPage: 1, perPage: perPage, total: items.length),
    );
  }

  Future<Announcement> show(String id) async {
    final data = await _api.get('/announcements/$id');
    return Announcement.fromJson(data as Map<String, dynamic>);
  }
}
