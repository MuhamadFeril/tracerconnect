import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/announcement.dart';
import '../../models/api_envelope.dart';
import 'announcements_repository.dart';

final announcementsRepositoryProvider =
    Provider<AnnouncementsRepository>((ref) => AnnouncementsRepository());

final announcementsProvider = FutureProvider.family<Paged<Announcement>, int>(
  (ref, page) => ref.watch(announcementsRepositoryProvider).list(page: page),
);

final announcementDetailProvider = FutureProvider.family<Announcement, String>(
  (ref, id) => ref.watch(announcementsRepositoryProvider).show(id),
);
