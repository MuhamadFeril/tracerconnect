import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/api_envelope.dart';
import '../../models/survey.dart';
import 'admin_survey_repository.dart';

final adminSurveyRepositoryProvider =
    Provider<AdminSurveyRepository>((ref) => AdminSurveyRepository());

/// Paginated survey list for admin (with search & status filter).
final adminSurveysProvider =
    FutureProvider.autoDispose.family<Paged<AdminSurveyItem>, ({String? search, String? status})>(
  (ref, filter) => ref
      .watch(adminSurveyRepositoryProvider)
      .list(search: filter.search, status: filter.status),
);

/// Full survey detail (sections + questions) for admin.
final adminSurveyDetailProvider =
    FutureProvider.autoDispose.family<SurveyDetail, String>(
  (ref, surveyId) => ref.watch(adminSurveyRepositoryProvider).show(surveyId),
);

/// Survey results for admin.
final adminSurveyResultsProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>(
  (ref, surveyId) => ref.watch(adminSurveyRepositoryProvider).surveyResults(surveyId),
);
