import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/api_envelope.dart';
import '../../models/survey.dart';
import '../../models/survey_response.dart';
import 'survey_repository.dart';

final surveyRepositoryProvider = Provider<SurveyRepository>((ref) => SurveyRepository());

final availableSurveysProvider =
    FutureProvider<List<SurveyItem>>((ref) => ref.watch(surveyRepositoryProvider).availableSurveys());

/// Riwayat respons milik user (halaman 1, dipakai beranda & tab riwayat).
final myResponsesProvider =
    FutureProvider<Paged<SurveyResponseItem>>((ref) async {
  return ref.watch(surveyRepositoryProvider).myResponses(page: 1, perPage: 20);
});

/// Detail respons tertentu (untuk halaman hasil kuisioner).
final responseDetailProvider =
    FutureProvider.family<SurveyFill, String>((ref, responseId) async {
  return ref.watch(surveyRepositoryProvider).showResponse(responseId);
});
