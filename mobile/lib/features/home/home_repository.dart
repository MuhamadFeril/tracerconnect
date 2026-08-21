import '../../core/network/api_client.dart';
import '../../models/alumni.dart';

class HomeRepository {
  final ApiClient _api = ApiClient.instance;

  Future<AlumniHomeData> home() async {
    final data = await _api.get('/alumni/home');
    return AlumniHomeData.fromJson(data as Map<String, dynamic>);
  }
}
