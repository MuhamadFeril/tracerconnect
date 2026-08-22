import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../models/job_application.dart';
import '../../models/job_vacancy.dart';

/// Ringkasan dashboard employer dari endpoint /employer/dashboard.
class EmployerDashboardData {
  final VacancyStats vacancies;
  final ApplicationStats applications;
  final List<JobApplication> recentApplications;
  final List<JobVacancy> myVacancies;

  const EmployerDashboardData({
    required this.vacancies,
    required this.applications,
    required this.recentApplications,
    required this.myVacancies,
  });

  factory EmployerDashboardData.fromJson(Map<String, dynamic> json) {
    return EmployerDashboardData(
      vacancies: VacancyStats.fromJson(
          json['vacancies'] as Map<String, dynamic>? ?? {}),
      applications: ApplicationStats.fromJson(
          json['applications'] as Map<String, dynamic>? ?? {}),
      recentApplications: (json['recent_applications'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(JobApplication.fromJson)
              .toList() ??
          [],
      myVacancies: (json['my_vacancies'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(JobVacancy.fromJson)
              .toList() ??
          [],
    );
  }
}

class VacancyStats {
  final int total;
  final int published;
  final int draft;
  final int closed;

  const VacancyStats({
    required this.total,
    required this.published,
    required this.draft,
    required this.closed,
  });

  factory VacancyStats.fromJson(Map<String, dynamic> json) {
    return VacancyStats(
      total: (json['total'] as num?)?.toInt() ?? 0,
      published: (json['published'] as num?)?.toInt() ?? 0,
      draft: (json['draft'] as num?)?.toInt() ?? 0,
      closed: (json['closed'] as num?)?.toInt() ?? 0,
    );
  }
}

class ApplicationStats {
  final int total;
  final int newCount;
  final int reviewing;
  final int shortlisted;
  final int interview;
  final int accepted;
  final int rejected;

  const ApplicationStats({
    required this.total,
    required this.newCount,
    required this.reviewing,
    required this.shortlisted,
    required this.interview,
    required this.accepted,
    required this.rejected,
  });

  factory ApplicationStats.fromJson(Map<String, dynamic> json) {
    return ApplicationStats(
      total: (json['total'] as num?)?.toInt() ?? 0,
      newCount: (json['new'] as num?)?.toInt() ?? 0,
      reviewing: (json['reviewing'] as num?)?.toInt() ?? 0,
      shortlisted: (json['shortlisted'] as num?)?.toInt() ?? 0,
      interview: (json['interview'] as num?)?.toInt() ?? 0,
      accepted: (json['accepted'] as num?)?.toInt() ?? 0,
      rejected: (json['rejected'] as num?)?.toInt() ?? 0,
    );
  }
}

final employerDashboardProvider =
    FutureProvider<EmployerDashboardData>((ref) async {
  final api = ApiClient.instance;
  final env = await api.getEnvelope('/employer/dashboard');
  return EmployerDashboardData.fromJson(env.data as Map<String, dynamic>);
});
