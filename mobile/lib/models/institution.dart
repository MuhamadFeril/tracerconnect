/// Opsi institusi untuk dropdown form registrasi (`/institutions/options`).
class InstitutionOption {
  final String id;
  final String name;
  final String? code;
  final String? logoPath;
  final String? website;

  const InstitutionOption({
    required this.id,
    required this.name,
    this.code,
    this.logoPath,
    this.website,
  });

  factory InstitutionOption.fromJson(Map<String, dynamic> json) {
    return InstitutionOption(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      code: json['code'] as String?,
      logoPath: json['logo_path'] as String?,
      website: json['website'] as String?,
    );
  }
}

/// Ringkasan institusi yang ditampilkan bersama user.
class InstitutionBrief {
  final String id;
  final String name;

  const InstitutionBrief({required this.id, required this.name});

  factory InstitutionBrief.fromJson(Map<String, dynamic> json) {
    return InstitutionBrief(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
    );
  }
}
