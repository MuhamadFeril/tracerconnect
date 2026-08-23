import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'branding_repository.dart';

final brandingRepositoryProvider =
    Provider<BrandingRepository>((ref) => BrandingRepository());

final brandingProvider =
    FutureProvider<InstitutionBranding>((ref) async {
  return ref.watch(brandingRepositoryProvider).getBranding();
});
