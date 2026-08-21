import '../../core/network/api_client.dart';
import '../../models/api_envelope.dart';
import '../../models/survey.dart';
import '../../models/survey_response.dart';

class SurveyRepository {
  final ApiClient _api = ApiClient.instance;

  /// Survey tersedia untuk alumni (`/alumni/surveys`).
  Future<List<SurveyItem>> availableSurveys() async {
    final data = await _api.get('/alumni/surveys');
    final list = data as List;
    return list.whereType<Map<String, dynamic>>().map(SurveyItem.fromJson).toList();
  }

  /// Riwayat respons milik user.
  Future<Paged<SurveyResponseItem>> myResponses({
    int page = 1,
    int perPage = 20,
  }) async {
    final env = await _api.getEnvelope('/responses/my', query: {
      'page': page,
      'per_page': perPage,
    });
    final items = (env.data as List)
        .whereType<Map<String, dynamic>>()
        .map(SurveyResponseItem.fromJson)
        .toList();
    return Paged(
      items: items,
      meta: env.meta ??
          PaginationMeta(currentPage: 1, lastPage: 1, perPage: 20, total: items.length),
    );
  }

  /// Mulai (atau lanjutkan) mengisi survey.
  Future<SurveyFill> start(String surveyId) async {
    final data = await _api.post('/surveys/$surveyId/start');
    return SurveyFill.fromJson(data as Map<String, dynamic>);
  }

  /// Simpan draft jawaban.
  Future<SurveyFill> save(String surveyId, Map<String, dynamic> answers) async {
    final data = await _api.post(
      '/surveys/$surveyId/responses/save',
      data: _answersPayload(answers),
    );
    return SurveyFill.fromJson(data as Map<String, dynamic>);
  }

  /// Kumpulkan jawaban.
  Future<SurveyFill> submit(String surveyId, Map<String, dynamic> answers) async {
    final data = await _api.post(
      '/surveys/$surveyId/responses/submit',
      data: _answersPayload(answers),
    );
    return SurveyFill.fromJson(data as Map<String, dynamic>);
  }

  /// Lihat respons milik sendiri (read-only).
  Future<SurveyFill> showResponse(String responseId) async {
    final data = await _api.get('/responses/$responseId');
    return SurveyFill.fromJson(data as Map<String, dynamic>);
  }

  Map<String, dynamic> _answersPayload(Map<String, dynamic> answers) {
    return {
      'answers': answers.entries
          .map((e) => {'question_id': e.key, 'value': e.value})
          .toList(),
    };
  }
}
