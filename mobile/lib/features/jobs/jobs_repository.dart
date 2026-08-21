import '../../core/network/api_client.dart';
import '../../models/api_envelope.dart';
import '../../models/job_application.dart';
import '../../models/job_vacancy.dart';

class JobsRepository {
  final ApiClient _api = ApiClient.instance;

  /// Kirim lamaran ke lowongan (cover letter opsional).
  Future<JobApplication> apply(String jobId, {String? coverLetter}) async {
    final data = await _api.post('/job-vacancies/$jobId/apply', data: {
      if (coverLetter != null && coverLetter.trim().isNotEmpty)
        'cover_letter': coverLetter.trim(),
    });
    return JobApplication.fromJson(data as Map<String, dynamic>);
  }

  /// Daftar lamaran milik pengguna yang sedang login.
  Future<Paged<JobApplication>> myApplications({int page = 1, int perPage = 15}) async {
    final env = await _api.getEnvelope('/applications/my', query: {
      'page': page,
      'per_page': perPage,
    });
    final items = (env.data as List)
        .whereType<Map<String, dynamic>>()
        .map(JobApplication.fromJson)
        .toList();
    return Paged(
      items: items,
      meta: env.meta ??
          PaginationMeta(currentPage: 1, lastPage: 1, perPage: 15, total: items.length),
    );
  }

  /// Tarik lamaran milik pengguna yang sedang login.
  Future<JobApplication> withdraw(String applicationId) async {
    final data = await _api.post('/applications/$applicationId/withdraw');
    return JobApplication.fromJson(data as Map<String, dynamic>);
  }

  Future<Paged<JobVacancy>> list({String? search, int page = 1, int perPage = 15}) async {
    final env = await _api.getEnvelope('/job-vacancies', query: {
      'page': page,
      'per_page': perPage,
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
    });
    final items = (env.data as List)
        .whereType<Map<String, dynamic>>()
        .map(JobVacancy.fromJson)
        .toList();
    return Paged(
      items: items,
      meta: env.meta ??
          PaginationMeta(currentPage: 1, lastPage: 1, perPage: 15, total: items.length),
    );
  }

  Future<JobVacancy> show(String id) async {
    final data = await _api.get('/job-vacancies/$id');
    return JobVacancy.fromJson(data as Map<String, dynamic>);
  }

  /// Bookmark lowongan.
  Future<void> bookmark(String jobId) async {
    await _api.post('/job-vacancies/$jobId/bookmark');
  }

  /// Hapus bookmark lowongan.
  Future<void> unbookmark(String jobId) async {
    await _api.delete('/job-vacancies/$jobId/bookmark');
  }
}
