import 'dart:async';

import 'package:dio/dio.dart';

import '../lib/core/constants/app_constants.dart';
import '../lib/core/network/anti_bot_bypass.dart';

Future<void> main() async {
  await AppConstants.init();

  final dio = Dio(
    BaseOptions(
      baseUrl: AppConstants.apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 55),
      headers: {'Accept': 'application/json', 'X-Platform': 'mobile'},
    ),
  );
  dio.interceptors.add(AntiBotInterceptor());

  // 1) Seed cookie via GET (what the app does on login/home fetch).
  try {
    final g = await dio
        .get<dynamic>('/regions/provinces')
        .timeout(const Duration(seconds: 60));
    print('GET provinces STATUS=${g.statusCode}');
  } on DioException catch (e) {
    print('GET provinces DioException status=${e.response?.statusCode}');
    print('GET provinces body=${e.response?.data}');
    print('GET provinces msg=${e.message} type=${e.type}');
    print('GET provinces resp headers=${e.response?.headers}');
  }

  // 2) POST register now that the cookie should be cached.
  final payload = <String, dynamic>{
    'name': 'Probe Register',
    'email': 'probe.${DateTime.now().millisecondsSinceEpoch}@example.com',
    'password': 'Password123!',
    'password_confirmation': 'Password123!',
    'institution_id': '01a07515-f48e-720b-9dd9-b66b0d43c842',
  };

  print('POST /auth/register payload=$payload');
  try {
    final res = await dio
        .post<dynamic>('/auth/register', data: payload)
        .timeout(const Duration(seconds: 60));
    print('POST STATUS=${res.statusCode}');
    print('POST BODY=${res.data}');
  } on DioException catch (e) {
    print('POST DioException');
    print('status=${e.response?.statusCode}');
    print('body=${e.response?.data}');
    print('headers=${e.response?.headers}');
    print('message=${e.message}');
    print('type=${e.type}');
  }
}