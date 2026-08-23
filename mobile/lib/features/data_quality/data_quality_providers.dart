import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'data_quality_repository.dart';

final dataQualityRepositoryProvider =
    Provider<DataQualityRepository>((ref) => DataQualityRepository());

final dataQualityProvider =
    FutureProvider<DataQualityReport>((ref) async {
  return ref.watch(dataQualityRepositoryProvider).getReport();
});
