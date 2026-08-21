/// Lamaran kerja alumni (job application).
class JobApplication {
  final String id;
  final String jobVacancyId;
  final String status; // submitted|reviewing|shortlisted|interview|accepted|rejected|withdrawn
  final String? coverLetter;
  final String? appliedAt;
  final JobApplicationVacancy? vacancy;

  const JobApplication({
    required this.id,
    required this.jobVacancyId,
    required this.status,
    this.coverLetter,
    this.appliedAt,
    this.vacancy,
  });

  factory JobApplication.fromJson(Map<String, dynamic> json) {
    return JobApplication(
      id: json['id'] as String? ?? '',
      jobVacancyId: json['job_vacancy_id'] as String? ?? '',
      status: json['status'] as String? ?? 'submitted',
      coverLetter: json['cover_letter'] as String?,
      appliedAt: json['applied_at'] as String?,
      vacancy: json['vacancy'] is Map<String, dynamic>
          ? JobApplicationVacancy.fromJson(json['vacancy'] as Map<String, dynamic>)
          : null,
    );
  }
}

class JobApplicationVacancy {
  final String id;
  final String title;
  final String companyName;
  final String? employmentType;
  final String? location;

  const JobApplicationVacancy({
    required this.id,
    required this.title,
    required this.companyName,
    this.employmentType,
    this.location,
  });

  factory JobApplicationVacancy.fromJson(Map<String, dynamic> json) {
    return JobApplicationVacancy(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      companyName: json['company_name'] as String? ?? '',
      employmentType: json['employment_type'] as String?,
      location: json['location'] as String?,
    );
  }
}
