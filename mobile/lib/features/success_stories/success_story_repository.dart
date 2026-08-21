import '../../core/network/api_client.dart';
import '../../models/success_story.dart';

class SuccessStoryRepository {
  final ApiClient _api = ApiClient.instance;

  Future<List<SuccessStory>> list({int page = 1, int perPage = 20}) async {
    final data = await _api.get('/success-stories', query: {
      'page': page,
      'per_page': perPage,
    });
    final list = data as List;
    return list
        .whereType<Map<String, dynamic>>()
        .map(SuccessStory.fromJson)
        .toList();
  }

  Future<SuccessStory> show(String id) async {
    final data = await _api.get('/success-stories/$id');
    return SuccessStory.fromJson(data as Map<String, dynamic>);
  }
}
