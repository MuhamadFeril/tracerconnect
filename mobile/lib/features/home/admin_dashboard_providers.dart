import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';

/// Ringkasan dashboard admin dari endpoint analytics/overview.
class AdminDashboardData {
  final int totalAlumni;
  final int totalRespondents;
  final double responseRate;
  final int totalSurveys;
  final int publishedSurveys;
  final List<Map<String, dynamic>> employmentDistribution;

  const AdminDashboardData({
    required this.totalAlumni,
    required this.totalRespondents,
    required this.responseRate,
    required this.totalSurveys,
    required this.publishedSurveys,
    required this.employmentDistribution,
  });

  factory AdminDashboardData.fromJson(Map<String, dynamic> json) {
    return AdminDashboardData(
      totalAlumni: (json['total_alumni'] as num?)?.toInt() ?? 0,
      totalRespondents: (json['total_respondents'] as num?)?.toInt() ?? 0,
      responseRate: (json['response_rate'] as num?)?.toDouble() ?? 0,
      totalSurveys: (json['total_surveys'] as num?)?.toInt() ?? 0,
      publishedSurveys: (json['published_surveys'] as num?)?.toInt() ?? 0,
      employmentDistribution:
          (json['employment_distribution'] as List?)
                  ?.whereType<Map<String, dynamic>>()
                  .toList() ??
              [],
    );
  }
}

final adminDashboardProvider =
    FutureProvider<AdminDashboardData>((ref) async {
  final api = ApiClient.instance;
  final env = await api.getEnvelope('/analytics/overview');
  return AdminDashboardData.fromJson(env.data as Map<String, dynamic>);
});
