import 'package:dio/dio.dart';

import '../../models/api_envelope.dart';
import 'rate_limiter.dart';

/// Exception aplikasi hasil parsing kesalahan API (envelope `success: false`).
class ApiException implements Exception {
  final int? statusCode;
  final String message;
  final Map<String, dynamic> errors;

  const ApiException({
    this.statusCode,
    required this.message,
    this.errors = const {},
  });

  factory ApiException.fromDio(DioException error) {
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      final env = ApiEnvelope.fromJson(data);
      var message = env.message.isNotEmpty ? env.message : 'Terjadi kesalahan';
      // 429 tanpa body terstruktur: pakai header Retry-After (paritas web).
      if ((error.response?.statusCode ?? 0) == 429 && env.message.isEmpty) {
        final raw = error.response?.headers.value('retry-after');
        message = RateLimiter.retryAfterMessage(int.tryParse(raw ?? ''));
      }
      return ApiException(
        statusCode: error.response?.statusCode,
        message: message,
        errors: env.errors,
      );
    }
    if (error.response?.statusCode == 429) {
      final raw = error.response?.headers.value('retry-after');
      return ApiException(
        statusCode: 429,
        message: RateLimiter.retryAfterMessage(int.tryParse(raw ?? '')),
      );
    }
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
        return const ApiException(
          message:
              'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.',
        );
      case DioExceptionType.cancel:
        return const ApiException(message: 'Permintaan dibatalkan.');
      default:
        return ApiException(
          statusCode: error.response?.statusCode,
          message: 'Terjadi kesalahan. Silakan coba lagi.',
        );
    }
  }

  @override
  String toString() => message;
}

/// Ambil pesan error pertama dari map validasi backend, mis.
/// `errors: { email: ["Email sudah digunakan"] }`.
String firstValidationMessage(ApiException e) {
  if (e.errors.isNotEmpty) {
    final first = e.errors.values.first;
    if (first is List && first.isNotEmpty) return first.first.toString();
    if (first != null && first.toString().isNotEmpty) return first.toString();
  }
  return e.message;
}
