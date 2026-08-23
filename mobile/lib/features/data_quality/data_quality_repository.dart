import '../../core/network/api_client.dart';

/// Models for Data Quality Center
class DataQualityReport {
  final int totalAlumni;
  final int healthScore;
  final String healthStatus;
  final MissingFields missingFields;
  final DuplicateInfo duplicates;
  final ProfileIssues profileIssues;
  final List<Recommendation> recommendations;

  const DataQualityReport({
    required this.totalAlumni,
    required this.healthScore,
    required this.healthStatus,
    required this.missingFields,
    required this.duplicates,
    required this.profileIssues,
    required this.recommendations,
  });

  factory DataQualityReport.fromJson(Map<String, dynamic> json) {
    return DataQualityReport(
      totalAlumni: json['total_alumni'] as int? ?? 0,
      healthScore: json['health_score'] as int? ?? 0,
      healthStatus: json['health_status'] as String? ?? '',
      missingFields: MissingFields.fromJson(
          json['missing_fields'] as Map<String, dynamic>? ?? {}),
      duplicates: DuplicateInfo.fromJson(
          json['duplicates'] as Map<String, dynamic>? ?? {}),
      profileIssues: ProfileIssues.fromJson(
          json['profile_issues'] as Map<String, dynamic>? ?? {}),
      recommendations: (json['recommendations'] as List<dynamic>?)
              ?.map((r) => Recommendation.fromJson(r as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class MissingFields {
  final int email;
  final int phone;
  final int graduationYear;
  final int department;
  final int address;
  final int employmentStatus;
  final int gender;
  final int birthDate;

  const MissingFields({
    required this.email,
    required this.phone,
    required this.graduationYear,
    required this.department,
    required this.address,
    required this.employmentStatus,
    required this.gender,
    required this.birthDate,
  });

  factory MissingFields.fromJson(Map<String, dynamic> json) {
    return MissingFields(
      email: json['email'] as int? ?? 0,
      phone: json['phone'] as int? ?? 0,
      graduationYear: json['graduation_year'] as int? ?? 0,
      department: json['department'] as int? ?? 0,
      address: json['address'] as int? ?? 0,
      employmentStatus: json['employment_status'] as int? ?? 0,
      gender: json['gender'] as int? ?? 0,
      birthDate: json['birth_date'] as int? ?? 0,
    );
  }

  /// All fields as a list for iteration.
  List<({String label, int count})> get asList => [
        (label: 'Email', count: email),
        (label: 'Telepon', count: phone),
        (label: 'Tahun Lulus', count: graduationYear),
        (label: 'Jurusan', count: department),
        (label: 'Alamat', count: address),
        (label: 'Status Kerja', count: employmentStatus),
        (label: 'Jenis Kelamin', count: gender),
        (label: 'Tanggal Lahir', count: birthDate),
      ];
}

class DuplicateInfo {
  final int totalGroups;
  final int totalDuplicates;
  final List<DuplicateGroup> groups;

  const DuplicateInfo({
    required this.totalGroups,
    required this.totalDuplicates,
    required this.groups,
  });

  factory DuplicateInfo.fromJson(Map<String, dynamic> json) {
    return DuplicateInfo(
      totalGroups: json['total_groups'] as int? ?? 0,
      totalDuplicates: json['total_duplicates'] as int? ?? 0,
      groups: (json['groups'] as List<dynamic>?)
              ?.map((g) => DuplicateGroup.fromJson(g as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class DuplicateGroup {
  final String name;
  final String? graduationYearId;
  final int count;

  const DuplicateGroup({
    required this.name,
    this.graduationYearId,
    required this.count,
  });

  factory DuplicateGroup.fromJson(Map<String, dynamic> json) {
    return DuplicateGroup(
      name: json['name'] as String? ?? '',
      graduationYearId: json['graduation_year_id'] as String?,
      count: json['count'] as int? ?? 0,
    );
  }
}

class ProfileIssues {
  final int withoutUserAccount;
  final int unreachable;
  final int incompleteProfiles;
  final int staleProfiles;

  const ProfileIssues({
    required this.withoutUserAccount,
    required this.unreachable,
    required this.incompleteProfiles,
    required this.staleProfiles,
  });

  factory ProfileIssues.fromJson(Map<String, dynamic> json) {
    return ProfileIssues(
      withoutUserAccount: json['without_user_account'] as int? ?? 0,
      unreachable: json['unreachable'] as int? ?? 0,
      incompleteProfiles: json['incomplete_profiles'] as int? ?? 0,
      staleProfiles: json['stale_profiles'] as int? ?? 0,
    );
  }
}

class Recommendation {
  final String priority;
  final String message;

  const Recommendation({required this.priority, required this.message});

  factory Recommendation.fromJson(Map<String, dynamic> json) {
    return Recommendation(
      priority: json['priority'] as String? ?? 'low',
      message: json['message'] as String? ?? '',
    );
  }
}

class DataQualityRepository {
  final ApiClient _api = ApiClient.instance;

  Future<DataQualityReport> getReport() async {
    final data = await _api.get('/data-quality');
    return DataQualityReport.fromJson(data as Map<String, dynamic>);
  }
}
