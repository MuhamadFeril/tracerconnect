import '../../core/network/api_client.dart';
import '../../models/api_envelope.dart';
import '../../models/event.dart';

class EventsRepository {
  final ApiClient _api = ApiClient.instance;

  Future<Paged<EventItem>> list({bool upcoming = true, int page = 1, int perPage = 15}) async {
    final env = await _api.getEnvelope('/events', query: {
      'page': page,
      'per_page': perPage,
      'upcoming': upcoming,
    });
    final items = (env.data as List?)
        ?.whereType<Map<String, dynamic>>()
        .map(EventItem.fromJson)
        .toList() ?? [];
    return Paged(
      items: items,
      meta: env.meta ??
          PaginationMeta(currentPage: 1, lastPage: 1, perPage: 15, total: items.length),
    );
  }

  Future<EventItem> show(String id) async {
    final data = await _api.get('/events/$id');
    return EventItem.fromJson(data as Map<String, dynamic>);
  }

  /// Daftarkan alumni ke acara.
  Future<void> register(String eventId) async {
    await _api.post('/events/$eventId/register');
  }

  /// Batalkan pendaftaran acara.
  Future<void> unregister(String eventId) async {
    await _api.delete('/events/$eventId/register');
  }
}
