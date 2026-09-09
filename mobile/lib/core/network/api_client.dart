import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';

import '../constants/app_constants.dart';
import '../../models/api_envelope.dart';
import 'api_error.dart';
import 'anti_bot_bypass.dart';
import 'rate_limiter.dart';

/// Klien HTTP tunggal berbasis Dio.
///
/// - Menyisipkan `Authorization: Bearer <token>` di setiap request.
/// - Memicu `onUnauthorized` saat menerima 401 (agar AuthController logout).
/// - Membongkar envelope `{ success, message, data, meta }` backend.
/// - Menerapkan timeout total per request (berlaku di semua platform,
///   termasuk web, tempat timeout bawaan Dio diabaikan) supaya tidak ada
///   layar yang menggantung di loading selamanya.
class ApiClient {
  ApiClient._();

  static final ApiClient instance = ApiClient._();

  /// Batas waktu total sebuah request (koneksi + respons). Bila terlampaui,
  /// request dibatalkan dan error "tidak dapat terhubung" dikembalikan.
  ///
  /// Nilai yang lebih besar (30 detik) mengakomodasi koneksi seluler yang
  /// lambat atau server shared hosting yang butuh waktu startup.
  static const Duration _requestTimeout = Duration(seconds: 60);

  static String? _token;
  static void Function()? onUnauthorized;

  static String? get token => _token;
  static void setToken(String? value) => _token = value;

  late final Dio _dio = _createDio();

  static Dio _createDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 55),
        headers: {
          'Accept': 'application/json',
          // Penanda platform agar backend bisa memberi perlakuan khusus
          // (mis. pengecualian rate limit untuk pengguna mobile terautentikasi).
          'X-Platform': 'mobile',
        },
      ),
    );

    // Anti-bot bypass interceptor (dijalankan duluan)
    dio.interceptors.add(AntiBotInterceptor());

    dio.httpClientAdapter = IOHttpClientAdapter(
      createHttpClient: () {
        final client = HttpClient();
        // Reject connections to non-HTTPS hosts (defense-in-depth).
        client.badCertificateCallback = (X509Certificate cert, String host, int port) {
          // Allow self-signed certs for local/private development hosts.
          final isDev = host == 'localhost' ||
              host == '127.0.0.1' ||
              host == '10.0.2.2' ||
              host.startsWith('192.168.') ||
              host.startsWith('10.') ||
              (host.startsWith('172.') && (() {
                final second = int.tryParse(host.split('.').elementAtOrNull(1) ?? '');
                return second != null && second >= 16 && second <= 31;
              })());
          if (isDev) return true;

          // For production: reject any certificate that fails chain validation.
          return false;
        };
        return client;
      },
    );

    // Auth & error interceptor
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = ApiClient.token;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          final status = error.response?.statusCode;
          final path = error.requestOptions.path;
          // 401 pada endpoint auth publik (login/register/google/reset)
          // hanyalah "kredensial salah / token Google tidak valid", bukan
          // sesi kedaluwarsa — jangan paksa logout. `forceLogout` hanya untuk
          // token yang sudah dipakai di endpoint yang butuh login.
          // Endpoint auth publik: 401 = kredensial salah, bukan sesi habis.
          final isPublicAuth = path.startsWith('/auth/login') ||
              path.startsWith('/auth/register') ||
              path.startsWith('/auth/google') ||
              path.startsWith('/auth/forgot-password') ||
              path.startsWith('/auth/reset-password') ||
              path.startsWith('/auth/verify-otp') ||
              path.startsWith('/auth/resend-otp') ||
              path.startsWith('/auth/password/otp');
          // Best-effort endpoints: 401 jangan paksa logout karena bisa
          // terjadi sebelum sesi benar-benar siap (mis. FCM token push).
          final isBestEffort = path.startsWith('/notifications/');
          if (status == 401 && !isPublicAuth && !isBestEffort) {
            onUnauthorized?.call();
          }
          handler.next(error);
        },
      ),
    );

    return dio;
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await _dio
          .get<dynamic>(path, queryParameters: query)
          .timeout(_requestTimeout);
      return _unwrap(res);
    } on TimeoutException {
      throw _timeoutException();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// GET yang mengembalikan envelope lengkap (termasuk `meta` paginasi).
  Future<ApiEnvelope> getEnvelope(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await _dio
          .get<dynamic>(path, queryParameters: query)
          .timeout(_requestTimeout);
      return _unwrapEnvelope(res);
    } on TimeoutException {
      throw _timeoutException();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<dynamic> post(String path, {Object? data, Map<String, dynamic>? query}) async {
    try {
      final res = await _dio
          .post<dynamic>(path, data: data, queryParameters: query)
          .timeout(_requestTimeout);
      return _unwrap(res);
    } on TimeoutException {
      throw _timeoutException();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<dynamic> put(String path, {Object? data, Map<String, dynamic>? query}) async {
    try {
      final res = await _dio
          .put<dynamic>(path, data: data, queryParameters: query)
          .timeout(_requestTimeout);
      return _unwrap(res);
    } on TimeoutException {
      throw _timeoutException();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<dynamic> delete(String path, {Object? data, Map<String, dynamic>? query}) async {
    try {
      final res = await _dio
          .delete<dynamic>(path, data: data, queryParameters: query)
          .timeout(_requestTimeout);
      return _unwrap(res);
    } on TimeoutException {
      throw _timeoutException();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Multipart upload (foto profil, dsb.).
  Future<dynamic> postForm(String path, FormData form) async {
    try {
      final res = await _dio.post<dynamic>(path, data: form).timeout(_requestTimeout);
      return _unwrap(res);
    } on TimeoutException {
      throw _timeoutException();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  ApiException _timeoutException() => const ApiException(
        statusCode: null,
        message:
            'Waktu koneksi habis. Periksa koneksi internet Anda dan pastikan server TracerAlumni berjalan.',
      );

  /// Pesan 429 dari header `Retry-After` — paritas dengan web.
  String _rateLimitMessage(Response<dynamic> res) {
    final raw = res.headers.value('retry-after');
    return RateLimiter.retryAfterMessage(int.tryParse(raw ?? ''));
  }

  dynamic _unwrap(Response<dynamic> res) {
    final body = res.data;
    if (body is Map<String, dynamic>) {
      final env = ApiEnvelope.fromJson(body);
      // HTTP error (4xx/5xx): jangan pernah memperlakukan respons gagal
      // sebagai sukses, meskipun body tidak memuat kunci `success` (mis.
      // body rate-limit bawaan Laravel `{ message: ... }`). Kalau dibiarkan,
      // `data` menjadi null dan pemanggil crash dengan error aneh — persis
      // yang membuat login tampak "gagal tanpa alasan".
      final statusCode = res.statusCode ?? 0;
      if (statusCode >= 400 || !env.success) {
        final message = env.message.isNotEmpty
            ? env.message
            : (statusCode == 429
                ? _rateLimitMessage(res)
                : 'Terjadi kesalahan');
        throw ApiException(
          statusCode: statusCode,
          message: message,
          errors: env.errors,
        );
      }
      return env.data;
    }
    return body;
  }

  ApiEnvelope _unwrapEnvelope(Response<dynamic> res) {
    final body = res.data;
    if (body is Map<String, dynamic>) {
      final env = ApiEnvelope.fromJson(body);
      final statusCode = res.statusCode ?? 0;
      if (statusCode >= 400 || !env.success) {
        final message = env.message.isNotEmpty
            ? env.message
            : (statusCode == 429
                ? _rateLimitMessage(res)
                : 'Terjadi kesalahan');
        throw ApiException(
          statusCode: statusCode,
          message: message,
          errors: env.errors,
        );
      }
      return env;
    }
    throw const ApiException(message: 'Respons tidak valid dari server.');
  }
}
