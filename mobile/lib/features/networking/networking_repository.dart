import '../../core/network/api_client.dart';
import '../../models/api_envelope.dart';
import '../../models/networking.dart';

class NetworkingRepository {
  final ApiClient _api = ApiClient.instance;

  Future<Paged<NetworkingAlumni>> directory({
    String? search,
    int page = 1,
    int perPage = 15,
  }) async {
    final env = await _api.getEnvelope('/networking/alumni', query: {
      'page': page,
      'per_page': perPage,
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
    });
    final items = (env.data as List?)
        ?.whereType<Map<String, dynamic>>()
        .map(NetworkingAlumni.fromJson)
        .toList() ?? [];
    return Paged(
      items: items,
      meta: env.meta ??
          PaginationMeta(currentPage: 1, lastPage: 1, perPage: perPage, total: items.length),
    );
  }

  Future<NetworkingAlumni> show(String alumnusId) async {
    final data = await _api.get('/networking/alumni/$alumnusId');
    return NetworkingAlumni.fromJson(data as Map<String, dynamic>);
  }

  Future<List<ConnectionItem>> connections() async {
    // Tahan terhadap perubahan backend: gunakan envelope agar shape
    // paginated {data: [...], meta} maupun array datar tetap terbaca.
    // Sebelumnya hanya pakai _api.get — jika meta ikut terkirim atau
    // backend mengubah wrapper, parsing gagal dan UI menampilkan
    // "Gagal memuat koneksi / permintaan".
    try {
      final env = await _api.getEnvelope('/networking/connections');
      return _parseConnections(env.data);
    } catch (_) {
      final data = await _api.get('/networking/connections');
      return _parseConnections(data);
    }
  }

  Future<List<ConnectionItem>> requests() async {
    try {
      final env = await _api.getEnvelope('/networking/requests');
      return _parseConnections(env.data);
    } catch (_) {
      final data = await _api.get('/networking/requests');
      return _parseConnections(data);
    }
  }

  /// Terima dua bentuk respons: array datar, atau bingkai paginator Laravel
  /// (`{ data: [...], current_page, ... }`) — sama seperti `unwrapPage` di web.
  static List<ConnectionItem> _parseConnections(dynamic data) {
    final raw = data is List
        ? data
        : (data is Map<String, dynamic> ? data['data'] : null);
    return (raw as List?)
            ?.whereType<Map<String, dynamic>>()
            .map(ConnectionItem.fromJson)
            .toList() ??
        [];
  }

  Future<void> sendConnection(String receiverId) async {
    await _api.post('/networking/connections', data: {'receiver_id': receiverId});
  }

  Future<void> acceptConnection(String connectionId) async {
    await _api.post('/networking/connections/$connectionId/accept');
  }

  Future<void> rejectConnection(String connectionId) async {
    await _api.post('/networking/connections/$connectionId/reject');
  }

  Future<void> removeConnection(String connectionId) async {
    await _api.delete('/networking/connections/$connectionId');
  }

  Future<void> block(String userId) async {
    await _api.post('/networking/block', data: {'blocked_id': userId});
  }

  Future<List<BlockedUserItem>> blocked() async {
    final data = await _api.get('/networking/blocked');
    return (data as List?)
        ?.whereType<Map<String, dynamic>>()
        .map(BlockedUserItem.fromJson)
        .toList() ?? [];
  }

  Future<void> unblock(String blockedId) async {
    await _api.delete('/networking/blocked/$blockedId');
  }

  Future<void> report({
    required String reportedId,
    required String reason,
    String? details,
  }) async {
    await _api.post('/networking/report', data: {
      'reported_id': reportedId,
      'reason': reason,
      if (details != null && details.isNotEmpty) 'details': details,
    });
  }
}
