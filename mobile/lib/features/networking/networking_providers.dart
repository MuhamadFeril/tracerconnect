import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/api_envelope.dart';
import '../../models/networking.dart';
import 'networking_repository.dart';

final networkingRepositoryProvider =
    Provider<NetworkingRepository>((ref) => NetworkingRepository());

typedef DirectoryQuery = ({String search, int page});

final directoryProvider =
    FutureProvider.family<Paged<NetworkingAlumni>, DirectoryQuery>(
  (ref, query) =>
      ref.watch(networkingRepositoryProvider).directory(search: query.search, page: query.page),
);

final alumniDetailProvider = FutureProvider.family<NetworkingAlumni, String>(
  (ref, id) => ref.watch(networkingRepositoryProvider).show(id),
);

final connectionsProvider = FutureProvider<List<ConnectionItem>>(
  (ref) => ref.watch(networkingRepositoryProvider).connections(),
);

final requestsProvider = FutureProvider<List<ConnectionItem>>(
  (ref) => ref.watch(networkingRepositoryProvider).requests(),
);
