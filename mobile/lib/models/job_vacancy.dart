class JobVacancy {
  final String id;
  final String institutionId;
  final String title;
  final String companyName;
  final String? description;
  final String? location;
  final String? employmentType;
  final String? applicationLink;
  final String status;
  final String? postedAt;
  final String? createdAt;
  final String? createdBy; // HRD (job creator) user id — untuk chat
  final bool isBookmarked;
  final int? applicantsCount;
  final bool? hasApplied;
  final String? myApplication;

  const JobVacancy({
    required this.id,
    required this.institutionId,
    required this.title,
    required this.companyName,
    this.description,
    this.location,
    this.employmentType,
    this.applicationLink,
    required this.status,
    this.postedAt,
    this.createdAt,
    this.createdBy,
    this.isBookmarked = false,
    this.applicantsCount,
    this.hasApplied,
    this.myApplication,
  });

  factory JobVacancy.fromJson(Map<String, dynamic> json) {
    return JobVacancy(
      id: json['id'] as String? ?? '',
      institutionId: json['institution_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      companyName: json['company_name'] as String? ?? '',
      description: json['description'] as String?,
      location: json['location'] as String?,
      employmentType: json['employment_type'] as String?,
      applicationLink: json['application_link'] as String?,
      status: json['status'] as String? ?? 'published',
      postedAt: json['posted_at'] as String?,
      createdAt: json['created_at'] as String?,
      createdBy: json['created_by'] as String?,
      // Support both field names for backwards compatibility
      isBookmarked: (json['is_bookmarked'] ?? json['bookmarked']) as bool? ?? false,
      applicantsCount: (json['applicants_count'] as num?)?.toInt(),
      hasApplied: json['has_applied'] as bool?,
      myApplication: json['my_application'] as String?,
    );
  }
}
