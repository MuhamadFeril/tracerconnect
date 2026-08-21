/// Riwayat respons milik user (`/responses/my`).
class SurveyResponseItem {
  final String id;
  final String? surveyId;
  final String? surveyTitle;
  final String status;
  final int version;
  final String? startedAt;
  final String? submittedAt;
  final int? completion;

  const SurveyResponseItem({
    required this.id,
    this.surveyId,
    this.surveyTitle,
    required this.status,
    required this.version,
    this.startedAt,
    this.submittedAt,
    this.completion,
  });

  factory SurveyResponseItem.fromJson(Map<String, dynamic> json) {
    final survey = json['survey'] is Map<String, dynamic>
        ? json['survey'] as Map<String, dynamic>
        : null;
    return SurveyResponseItem(
      id: json['id'] as String? ?? '',
      surveyId: survey?['id'] as String?,
      surveyTitle: survey?['title'] as String?,
      status: json['status'] as String? ?? 'in_progress',
      version: json['version'] as int? ?? 1,
      startedAt: json['started_at'] as String?,
      submittedAt: json['submitted_at'] as String?,
      completion: (json['completion'] as num?)?.toInt(),
    );
  }
}
