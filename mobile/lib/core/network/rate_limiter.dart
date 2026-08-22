import 'api_error.dart';

/// Pembatas laju sisi klien — paritas dengan `web/src/lib/rateLimiter.ts`.
///
/// Setiap request ke endpoint di bawah minimal berjarak [minIntervalsMs]
/// dari request sebelumnya; jika dilanggar, request tidak dikirim dan
/// langsung melempar [ApiException] ber-status 429 dengan pesan hitung
/// mundur, sama seperti interceptor axios di web.
class RateLimiter {
  RateLimiter._();

  static final Map<String, DateTime> _lastCall = {};

  /// Endpoint → jeda minimum antar-request (milidetik).
  static const Map<String, int> minIntervalsMs = {
    '/auth/login': 2000,
    '/auth/resend-otp': 10000,
    '/auth/forgot-password': 5000,
    '/auth/register': 3000,
    '/auth/verify-otp': 2000,
    '/auth/password/otp': 10000,
    // Semua endpoint percakapan chat dibatasi >= 500 ms.
    '/conversations': 500,
  };

  /// Cek apakah [path] boleh dipanggil sekarang.
  ///
  /// Melempar [ApiException] (429) bila masih dalam masa jeda.
  static void enforce(String path) {
    final match = _match(path);
    if (match == null) return;

    final (storageKey, intervalMs) = match;
    final last = _lastCall[storageKey];
    final now = DateTime.now();
    if (last != null) {
      final elapsed = now.difference(last).inMilliseconds;
      if (elapsed < intervalMs) {
        final seconds = ((intervalMs - elapsed) / 1000).ceil();
        throw ApiException(
          statusCode: 429,
          message:
              'Terlalu banyak percobaan. Tunggu ${seconds.clamp(1, 60)} detik.',
        );
      }
    }
    _lastCall[storageKey] = now;
  }

  /// Kembalikan `(kunci penyimpanan, jeda ms)` untuk [path], atau null bila
  /// endpoint tidak dibatasi.
  ///
  /// Endpoint chat memakai path penuh sebagai kunci: saat membuka satu
  /// percakapan, tiga endpoint berbeda ditembakkan hampir bersamaan (detail +
  /// daftar pesan + tandai dibaca) dan polling 5 detik menyegarkan dua
  /// provider pada tick yang sama. Dengan satu prefix bersama, request
  /// kedua/ketiga selalu gagal 429 lokal — di web kegagalan sesaat seperti
  /// ini tertutupi retry bawaan react-query, sedangkan provider Riverpod
  /// tidak melakukan retry sehingga error langsung tampil di layar chat.
  static (String, int)? _match(String path) {
    for (final entry in minIntervalsMs.entries) {
      if (!path.startsWith(entry.key)) continue;
      return (
        entry.key == '/conversations' ? path : entry.key,
        entry.value,
      );
    }
    return null;
  }

  /// Bangun pesan 429 dari header `Retry-After` (detik), fallback 60 dtk —
  /// paritas dengan parsing di web.
  static String retryAfterMessage(int? retryAfterSeconds) {
    final seconds = (retryAfterSeconds == null || retryAfterSeconds <= 0)
        ? 60
        : retryAfterSeconds;
    return 'Terlalu banyak percobaan. Tunggu $seconds detik.';
  }
}
