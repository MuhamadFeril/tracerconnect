import '../../core/network/api_client.dart';
import '../../models/api_envelope.dart';
import 'admin_models.dart';

/// Admin-facing repository — alumni & user management for mobile.
class AdminRepository {
  final ApiClient _api = ApiClient.instance;

  // ---- Alumni -----------------------------------------------------------

  /// Paginated alumni list (search by name/email/nis).
  Future<Paged<AlumniListItem>> listAlumni({
    String? search,
    int page = 1,
    int perPage = 20,
  }) async {
    final params = <String, dynamic>{'page': page, 'per_page': perPage};
    if (search != null && search.isNotEmpty) params['search'] = search;

    final env = await _api.getEnvelope('/alumni', query: params);
    final items = (env.data as List)
        .map((j) => AlumniListItem.fromJson(j as Map<String, dynamic>))
        .toList();
    return Paged(items: items, meta: env.meta!);
  }

  /// Show single alumni detail.
  Future<AlumniListItem> showAlumni(String id) async {
    final data = await _api.get('/alumni/$id');
    return AlumniListItem.fromJson(data as Map<String, dynamic>);
  }

  /// Soft-delete an alumni record.
  Future<void> deleteAlumni(String id) async {
    await _api.delete('/alumni/$id');
  }

  // ---- Users ------------------------------------------------------------

  /// Paginated user list (search by name/email, filter by role).
  Future<Paged<UserListItem>> listUsers({
    String? search,
    String? role,
    int page = 1,
    int perPage = 20,
  }) async {
    final params = <String, dynamic>{'page': page, 'per_page': perPage};
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (role != null && role.isNotEmpty) params['role'] = role;

    final env = await _api.getEnvelope('/users', query: params);
    final items = (env.data as List)
        .map((j) => UserListItem.fromJson(j as Map<String, dynamic>))
        .toList();
    return Paged(items: items, meta: env.meta!);
  }

  /// Update a user's role.
  Future<UserListItem> updateUserRole(String userId, String role) async {
    final data = await _api.put('/users/$userId', data: {'role': role});
    return UserListItem.fromJson(data as Map<String, dynamic>);
  }

  /// Delete (soft-delete) a user.
  Future<void> deleteUser(String userId) async {
    await _api.delete('/users/$userId');
  }
}
