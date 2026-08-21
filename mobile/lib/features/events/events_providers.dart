import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/api_envelope.dart';
import '../../models/event.dart';
import 'events_repository.dart';

final eventsRepositoryProvider = Provider<EventsRepository>((ref) => EventsRepository());

final eventsProvider = FutureProvider.family<Paged<EventItem>, int>(
  (ref, page) => ref.watch(eventsRepositoryProvider).list(page: page),
);

final eventDetailProvider = FutureProvider.family<EventItem, String>(
  (ref, id) => ref.watch(eventsRepositoryProvider).show(id),
);
