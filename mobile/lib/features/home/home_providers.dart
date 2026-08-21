import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/alumni.dart';
import 'home_repository.dart';

final homeRepositoryProvider = Provider<HomeRepository>((ref) => HomeRepository());

final homeDataProvider =
    FutureProvider<AlumniHomeData>((ref) => ref.watch(homeRepositoryProvider).home());
