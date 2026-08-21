class SuccessStory {
  final String id;
  final String institutionId;
  final String title;
  final String category;
  final String categoryLabel;
  final String content;
  final String? coverImageUrl;
  final SuccessStoryAlumni? alumni;
  final String status;
  final String? publishedAt;
  final String? createdAt;
  final String? updatedAt;

  const SuccessStory({
    required this.id,
    required this.institutionId,
    required this.title,
    required this.category,
    required this.categoryLabel,
    required this.content,
    this.coverImageUrl,
    this.alumni,
    required this.status,
    this.publishedAt,
    this.createdAt,
    this.updatedAt,
  });

  factory SuccessStory.fromJson(Map<String, dynamic> json) {
    return SuccessStory(
      id: json['id'] as String? ?? '',
      institutionId: json['institution_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      category: json['category'] as String? ?? 'other',
      categoryLabel: json['category_label'] as String? ?? 'Lainnya',
      content: json['content'] as String? ?? '',
      coverImageUrl: json['cover_image_url'] as String?,
      alumni: json['alumni'] != null
          ? SuccessStoryAlumni.fromJson(json['alumni'] as Map<String, dynamic>)
          : null,
      status: json['status'] as String? ?? 'draft',
      publishedAt: json['published_at'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }
}

class SuccessStoryAlumni {
  final String id;
  final String name;
  final String? department;
  final int? graduationYear;

  const SuccessStoryAlumni({
    required this.id,
    required this.name,
    this.department,
    this.graduationYear,
  });

  factory SuccessStoryAlumni.fromJson(Map<String, dynamic> json) {
    return SuccessStoryAlumni(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      department: json['department'] as String?,
      graduationYear: json['graduation_year'] as int?,
    );
  }
}
