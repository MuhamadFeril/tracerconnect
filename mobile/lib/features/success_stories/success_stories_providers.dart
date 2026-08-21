import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/success_story.dart';
import 'success_story_repository.dart';

final successStoryRepositoryProvider =
    Provider<SuccessStoryRepository>((ref) => SuccessStoryRepository());

final successStoriesProvider =
    FutureProvider<List<SuccessStory>>((ref) async {
  return ref.watch(successStoryRepositoryProvider).list();
});

final successStoryDetailProvider =
    FutureProvider.family<SuccessStory, String>((ref, id) async {
  return ref.watch(successStoryRepositoryProvider).show(id);
});
