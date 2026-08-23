import 'dart:io';

import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../models/api_envelope.dart';
import '../../models/job_application.dart';
import '../../models/job_vacancy.dart';

/// Model ringkas untuk applicant yang dilihat employer.
class JobApplicant {
  final String id;
  final String userId;
  final String? alumniId;
  final String status;
  final String? coverLetter;
  final Map<String, dynamic>? cvData;
  final String? appliedAt;
  final String? alumniName;
  final String? alumniDepartment;
  final int? alumniGraduationYear;
  final String? alumniEmploymentStatus;
  final String? positionOffered;

  const JobApplicant({
    required this.id,
    required this.userId,
    this.alumniId,
    required this.status,
    this.coverLetter,
    this.cvData,
    this.appliedAt,
    this.alumniName,
    this.alumniDepartment,
    this.alumniGraduationYear,
    this.alumniEmploymentStatus,
    this.positionOffered,
  });

  factory JobApplicant.fromJson(Map<String, dynamic> json) {
    final alumni = json['alumni'] as Map<String, dynamic>?;
    final acceptance = json['acceptance'] as Map<String, dynamic>?;
    return JobApplicant(
      id: json['id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      alumniId: alumni?['id'] as String?,
      status: json['status'] as String? ?? 'submitted',
      coverLetter: json['cover_letter'] as String?,
      cvData: json['cv_data'] as Map<String, dynamic>?,
      appliedAt: json['applied_at'] as String?,
      alumniName: alumni?['name'] as String?,
      alumniDepartment: alumni?['department'] as String?,
      alumniGraduationYear: (alumni?['graduation_year'] as num?)?.toInt(),
      alumniEmploymentStatus: alumni?['employment_status'] as String?,
      positionOffered: acceptance?['position_offered'] as String?,
    );
  }
}

class JobsRepository {
  final ApiClient _api = ApiClient.instance;

  /// Kirim lamaran ke lowongan (cover letter + CV data opsional).
  Future<JobApplication> apply(
    String jobId, {
    String? coverLetter,
    Map<String, dynamic>? cvData,
    File? cvFile,
    File? portfolioFile,
  }) async {
    // Build form data for file uploads.
    final form = <String, dynamic>{};
    if (coverLetter != null && coverLetter.trim().isNotEmpty) {
      form['cover_letter'] = coverLetter.trim();
    }
    // cvData as nested fields.
    if (cvData != null) {
      cvData.forEach((key, value) {
        if (value is List) {
          for (var i = 0; i < value.length; i++) {
            form['cv_data[$key][$i]'] = value[i].toString();
          }
        } else if (value != null && value.toString().isNotEmpty) {
          form['cv_data[$key]'] = value.toString();
        }
      });
    }
    // Attach files.
    if (cvFile != null || portfolioFile != null) {
      final formData = FormData.fromMap({
        ...form,
        if (cvFile != null)
          'cv': await MultipartFile.fromFile(
            cvFile.path,
            filename: cvFile.path.split('/').last,
          ),
        if (portfolioFile != null)
          'portfolio': await MultipartFile.fromFile(
            portfolioFile.path,
            filename: portfolioFile.path.split('/').last,
          ),
      });
      final data = await _api.postForm('/job-vacancies/$jobId/apply', formData);
      return JobApplication.fromJson(data as Map<String, dynamic>);
    }
    final data = await _api.post('/job-vacancies/$jobId/apply', data: form);
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

  // ------------------------------------------------------------------
  // Employer CRUD
  // ------------------------------------------------------------------

  /// Buat lowongan baru (employer / admin).
  Future<JobVacancy> createJob(Map<String, dynamic> payload) async {
    final data = await _api.post('/job-vacancies', data: payload);
    return JobVacancy.fromJson(data as Map<String, dynamic>);
  }

  /// Update lowongan yang sudah ada.
  Future<JobVacancy> updateJob(
      String id, Map<String, dynamic> payload) async {
    final data = await _api.put('/job-vacancies/$id', data: payload);
    return JobVacancy.fromJson(data as Map<String, dynamic>);
  }

  /// Hapus lowongan.
  Future<void> deleteJob(String id) async {
    await _api.delete('/job-vacancies/$id');
  }

  /// Daftar pelamar untuk lowongan tertentu (employer / admin).
  Future<Paged<JobApplicant>> applicants(
    String jobId, {
    int page = 1,
    int perPage = 15,
    String? status,
  }) async {
    final env = await _api.getEnvelope(
      '/job-vacancies/$jobId/applications',
      query: {
        'page': page,
        'per_page': perPage,
        if (status != null && status.isNotEmpty) 'status': status,
      },
    );
    final items = (env.data as List)
        .whereType<Map<String, dynamic>>()
        .map(JobApplicant.fromJson)
        .toList();
    return Paged(
      items: items,
      meta: env.meta ??
          PaginationMeta(currentPage: 1, lastPage: 1, perPage: 15, total: items.length),
    );
  }

  /// Ubah status lamaran (employer / admin).
  Future<void> updateApplicationStatus(
      String applicationId, String status) async {
    await _api.put('/applications/$applicationId/status', data: {
      'status': status,
    });
  }
}
