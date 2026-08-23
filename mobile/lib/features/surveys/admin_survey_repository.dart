import '../../core/network/api_client.dart';
import '../../models/api_envelope.dart';
import '../../models/survey.dart';

/// Admin-facing survey repository — CRUD for surveys, sections, and questions.
class AdminSurveyRepository {
  final ApiClient _api = ApiClient.instance;

  // ── Survey CRUD ──────────────────────────────────────────────────────

  /// Paginated list of surveys for the admin's institution.
  Future<Paged<AdminSurveyItem>> list({
    int page = 1,
    int perPage = 20,
    String? search,
    String? status,
  }) async {
    final env = await _api.getEnvelope('/surveys', query: {
      'page': page,
      'per_page': perPage,
      if (search != null && search.isNotEmpty) 'search': search,
      if (status != null && status.isNotEmpty) 'status': status,
    });
    final items = (env.data as List?)
            ?.whereType<Map<String, dynamic>>()
            .map(AdminSurveyItem.fromJson)
            .toList() ??
        [];
    return Paged(
      items: items,
      meta: env.meta ??
          PaginationMeta(currentPage: 1, lastPage: 1, perPage: perPage, total: items.length),
    );
  }

  /// Get full survey detail (sections + questions).
  Future<SurveyDetail> show(String surveyId) async {
    final data = await _api.get('/surveys/$surveyId');
    return SurveyDetail.fromJson(data as Map<String, dynamic>);
  }

  /// Create a new survey (draft).
  Future<AdminSurveyItem> create({
    required String title,
    String? description,
    String? startsAt,
    String? expiresAt,
  }) async {
    final data = await _api.post('/surveys', data: {
      'title': title,
      if (description != null && description.isNotEmpty) 'description': description,
      if (startsAt != null) 'starts_at': startsAt,
      if (expiresAt != null) 'expires_at': expiresAt,
    });
    return AdminSurveyItem.fromJson(data as Map<String, dynamic>);
  }

  /// Update survey metadata (title, description, dates).
  Future<AdminSurveyItem> update(
    String surveyId, {
    String? title,
    String? description,
    String? startsAt,
    String? expiresAt,
  }) async {
    final data = await _api.put('/surveys/$surveyId', data: {
      if (title != null) 'title': title,
      if (description != null) 'description': description,
      if (startsAt != null) 'starts_at': startsAt,
      if (expiresAt != null) 'expires_at': expiresAt,
    });
    return AdminSurveyItem.fromJson(data as Map<String, dynamic>);
  }

  /// Delete a survey.
  Future<void> delete(String surveyId) async {
    await _api.delete('/surveys/$surveyId');
  }

  /// Publish a survey (make visible to alumni).
  Future<AdminSurveyItem> publish(String surveyId) async {
    final data = await _api.post('/surveys/$surveyId/publish');
    return AdminSurveyItem.fromJson(data as Map<String, dynamic>);
  }

  /// Unpublish a survey (back to draft).
  Future<AdminSurveyItem> unpublish(String surveyId) async {
    final data = await _api.post('/surveys/$surveyId/unpublish');
    return AdminSurveyItem.fromJson(data as Map<String, dynamic>);
  }

  // ── Section CRUD ─────────────────────────────────────────────────────

  /// Add a section to a survey.
  Future<void> createSection(String surveyId, {
    required String title,
    String? description,
  }) async {
    await _api.post('/surveys/$surveyId/sections', data: {
      'title': title,
      if (description != null && description.isNotEmpty) 'description': description,
    });
  }

  /// Update a section.
  Future<void> updateSection(String sectionId, {
    String? title,
    String? description,
  }) async {
    await _api.put('/survey-sections/$sectionId', data: {
      if (title != null) 'title': title,
      if (description != null) 'description': description,
    });
  }

  /// Delete a section.
  Future<void> deleteSection(String sectionId) async {
    await _api.delete('/survey-sections/$sectionId');
  }

  // ── Question CRUD ────────────────────────────────────────────────────

  /// Add a question to a survey.
  Future<void> createQuestion(String surveyId, {
    required String type,
    required String label,
    String? helpText,
    bool isRequired = false,
    String? sectionId,
    int? order,
    Map<String, dynamic>? settings,
    List<Map<String, dynamic>>? options,
  }) async {
    await _api.post('/surveys/$surveyId/questions', data: {
      'type': type,
      'label': label,
      if (helpText != null && helpText.isNotEmpty) 'help_text': helpText,
      'is_required': isRequired,
      if (sectionId != null) 'section_id': sectionId,
      if (order != null) 'order': order,
      if (settings != null) 'settings': settings,
      if (options != null && options.isNotEmpty) 'options': options,
    });
  }

  /// Update a question.
  Future<void> updateQuestion(String questionId, {
    String? type,
    String? label,
    String? helpText,
    bool? isRequired,
    Map<String, dynamic>? settings,
    List<Map<String, dynamic>>? options,
  }) async {
    await _api.put('/questions/$questionId', data: {
      if (type != null) 'type': type,
      if (label != null) 'label': label,
      if (helpText != null) 'help_text': helpText,
      if (isRequired != null) 'is_required': isRequired,
      if (settings != null) 'settings': settings,
      if (options != null) 'options': options,
    });
  }

  /// Delete a question.
  Future<void> deleteQuestion(String questionId) async {
    await _api.delete('/questions/$questionId');
  }

  // ── Survey Results ───────────────────────────────────────────────────

  /// Get aggregated survey results.
  Future<Map<String, dynamic>> surveyResults(String surveyId) async {
    final data = await _api.get('/analytics/surveys/$surveyId/results');
    return data as Map<String, dynamic>;
  }
}
