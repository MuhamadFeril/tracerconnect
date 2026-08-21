/// Universitas Indonesia dari endpoint publik `/universities`.
class University {
  final String id;
  final String code;
  final String name;
  final String? type;
  final String? province;
  final String? city;

  const University({
    required this.id,
    required this.code,
    required this.name,
    this.type,
    this.province,
    this.city,
  });

  factory University.fromJson(Map<String, dynamic> json) {
    return University(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      type: json['type'] as String?,
      province: json['province'] as String?,
      city: json['city'] as String?,
    );
  }
}

/// Program studi (prodi) dari endpoint `/universities/{id}/study-programs`.
class StudyProgram {
  final String id;
  final String name;

  const StudyProgram({required this.id, required this.name});

  factory StudyProgram.fromJson(Map<String, dynamic> json) {
    return StudyProgram(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
    );
  }
}
