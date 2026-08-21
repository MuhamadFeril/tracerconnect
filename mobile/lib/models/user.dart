import 'institution.dart';

class SocialLink {
  final String platform;
  final String url;

  const SocialLink({required this.platform, required this.url});

  factory SocialLink.fromJson(dynamic json) {
    final map = json is Map<String, dynamic> ? json : const <String, dynamic>{};
    return SocialLink(
      platform: map['platform'] as String? ?? '',
      url: map['url'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'platform': platform, 'url': url};
}

/// Profil alumni yang tertaut dengan akun user (bagian dari `UserResource`).
class AlumniProfile {
  final String id;
  final String name;
  final String? nisNim;
  final String? nisn;
  final List<SocialLink> socials;
  final List<String> skills;
  final String? gender;
  final String? phone;
  final String? birthDate;
  final String? birthplace;
  final String? birthplaceRegency;
  final String? birthplaceProvince;
  final String? address;
  final String? department;
  final int? graduationYear;
  final String? birthplaceLabel;
  final String? employmentStatus;

  const AlumniProfile({
    required this.id,
    required this.name,
    this.nisNim,
    this.nisn,
    this.socials = const [],
    this.skills = const [],
    this.gender,
    this.phone,
    this.birthDate,
    this.birthplace,
    this.birthplaceRegency,
    this.birthplaceProvince,
    this.address,
    this.department,
    this.graduationYear,
    this.birthplaceLabel,
    this.employmentStatus,
  });

  factory AlumniProfile.fromJson(Map<String, dynamic> json) {
    return AlumniProfile(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      nisNim: json['nis_nim'] as String?,
      nisn: json['nisn'] as String?,
      socials: (json['socials'] as List?)
              ?.map((e) => SocialLink.fromJson(e))
              .toList() ??
          const [],
      skills: (json['skills'] as List?)?.map((e) => e.toString()).toList() ??
          const [],
      gender: json['gender'] as String?,
      phone: json['phone'] as String?,
      birthDate: json['birth_date'] as String?,
      birthplace: json['birthplace'] as String?,
      birthplaceRegency: json['birthplace_regency'] as String?,
      birthplaceProvince: json['birthplace_province'] as String?,
      address: json['address'] as String?,
      department: json['department'] as String?,
      graduationYear: (json['graduation_year'] as num?)?.toInt(),
      birthplaceLabel: json['birthplace_label'] as String?,
      employmentStatus: json['employment_status'] as String?,
    );
  }
}

class User {
  final String id;
  final String name;
  final String email;
  final String? institutionId;
  final String? avatarUrl;
  final InstitutionBrief? institution;
  final List<String> roles;
  final String? gender;
  final String? phone;
  final String? birthDate;
  final String? birthplace;
  final String? birthplaceRegency;
  final String? birthplaceProvince;
  final String? address;
  final AlumniProfile? alumni;
  final bool isActive;

  const User({
    required this.id,
    required this.name,
    required this.email,
    this.institutionId,
    this.avatarUrl,
    this.institution,
    this.roles = const [],
    this.gender,
    this.phone,
    this.birthDate,
    this.birthplace,
    this.birthplaceRegency,
    this.birthplaceProvince,
    this.address,
    this.alumni,
    this.isActive = true,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      institutionId: json['institution_id'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      institution: json['institution'] is Map<String, dynamic>
          ? InstitutionBrief.fromJson(json['institution'] as Map<String, dynamic>)
          : null,
      roles: (json['roles'] as List?)?.map((e) => e.toString()).toList() ??
          const [],
      gender: json['gender'] as String?,
      phone: json['phone'] as String?,
      birthDate: json['birth_date'] as String?,
      birthplace: json['birthplace'] as String?,
      birthplaceRegency: json['birthplace_regency'] as String?,
      birthplaceProvince: json['birthplace_province'] as String?,
      address: json['address'] as String?,
      alumni: json['alumni'] is Map<String, dynamic>
          ? AlumniProfile.fromJson(json['alumni'] as Map<String, dynamic>)
          : null,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}
