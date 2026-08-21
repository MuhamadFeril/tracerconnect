import 'announcement.dart';
import 'event.dart';
import 'institution.dart';
import 'job_vacancy.dart';

/// Ringkasan profil alumni di beranda (`/alumni/home`).
class AlumniHomeProfile {
  final String id;
  final String name;
  final String? nisNim;
  final String? department;
  final int? graduationYear;
  final String? birthplaceLabel;
  final String? employmentStatus;
  final String? companyName;
  final String? position;
  final String? businessField;
  final int? businessStartYear;
  final String? location;
  final String? workProvince;
  final String? workCity;
  final String? studyInstitution;
  final String? studyProgram;
  final int? studyEntryYear;
  final String? businessName;
  final String? businessAddress;
  final String? businessProvince;
  final String? businessCity;

  const AlumniHomeProfile({
    required this.id,
    required this.name,
    this.nisNim,
    this.department,
    this.graduationYear,
    this.birthplaceLabel,
    this.employmentStatus,
    this.companyName,
    this.position,
    this.businessField,
    this.businessStartYear,
    this.location,
    this.workProvince,
    this.workCity,
    this.studyInstitution,
    this.studyProgram,
    this.studyEntryYear,
    this.businessName,
    this.businessAddress,
    this.businessProvince,
    this.businessCity,
  });

  factory AlumniHomeProfile.fromJson(Map<String, dynamic> json) {
    return AlumniHomeProfile(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      nisNim: json['nis_nim'] as String?,
      department: json['department'] as String?,
      graduationYear: (json['graduation_year'] as num?)?.toInt(),
      birthplaceLabel: json['birthplace_label'] as String?,
      employmentStatus: json['employment_status'] as String?,
      companyName: json['company_name'] as String?,
      position: json['position'] as String?,
      businessField: json['business_field'] as String?,
      businessStartYear: (json['business_start_year'] as num?)?.toInt(),
      location: json['location'] as String?,
      workProvince: json['work_province'] as String?,
      workCity: json['work_city'] as String?,
      studyInstitution: json['study_institution'] as String?,
      studyProgram: json['study_program'] as String?,
      studyEntryYear: (json['study_entry_year'] as num?)?.toInt(),
      businessName: json['business_name'] as String?,
      businessAddress: json['business_address'] as String?,
      businessProvince: json['business_province'] as String?,
      businessCity: json['business_city'] as String?,
    );
  }

  /// Baris utama detail karir sesuai status pekerjaan.
  String? get careerLine {
    switch (employmentStatus) {
      case 'working':
        return [position, companyName].where((e) => e != null && e.isNotEmpty).join(' di ');
      case 'continuing_study':
        return [studyProgram, studyInstitution].where((e) => e != null && e.isNotEmpty).join(' · ');
      case 'entrepreneur':
        return businessName;
      default:
        return null;
    }
  }

  /// Lokasi kerja/usaha sesuai status.
  String? get careerLocation {
    if (employmentStatus == 'entrepreneur') {
      return [businessCity, businessProvince].where((e) => e != null && e.isNotEmpty).join(', ');
    }
    return [workCity, workProvince].where((e) => e != null && e.isNotEmpty).join(', ');
  }

  /// Bidang usaha/industri untuk bekerja & wirausaha.
  String? get careerField {
    if (employmentStatus != 'working' && employmentStatus != 'entrepreneur') return null;
    return businessField;
  }
}

/// Data beranda alumni: institusi + ringkasan alumni + feed terbaru.
class AlumniHomeData {
  final InstitutionBrief? institution;
  final AlumniHomeProfile? alumni;
  final List<Announcement> announcements;
  final List<EventItem> events;
  final List<JobVacancy> jobs;

  const AlumniHomeData({
    this.institution,
    this.alumni,
    this.announcements = const [],
    this.events = const [],
    this.jobs = const [],
  });

  factory AlumniHomeData.fromJson(Map<String, dynamic> json) {
    return AlumniHomeData(
      institution: json['institution'] is Map<String, dynamic>
          ? InstitutionBrief.fromJson(json['institution'] as Map<String, dynamic>)
          : null,
      alumni: json['alumni'] is Map<String, dynamic>
          ? AlumniHomeProfile.fromJson(json['alumni'] as Map<String, dynamic>)
          : null,
      announcements: (json['announcements'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(Announcement.fromJson)
              .toList() ??
          const [],
      events: (json['events'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(EventItem.fromJson)
              .toList() ??
          const [],
      jobs: (json['jobs'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(JobVacancy.fromJson)
              .toList() ??
          const [],
    );
  }
}
