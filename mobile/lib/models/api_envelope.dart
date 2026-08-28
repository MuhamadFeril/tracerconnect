/// Envelope standar API backend:
/// `{ success, message, data, meta }` untuk sukses,
/// `{ success: false, message, errors }` untuk error.
class ApiEnvelope {
  final bool success;
  final String message;
  final dynamic data;
  final PaginationMeta? meta;
  final Map<String, dynamic> errors;

  const ApiEnvelope({
    required this.success,
    required this.message,
    this.data,
    this.meta,
    this.errors = const {},
  });

  factory ApiEnvelope.fromJson(Map<String, dynamic> json) {
    return ApiEnvelope(
      success: json['success'] as bool? ?? true,
      message: json['message'] as String? ?? '',
      data: json['data'],
      meta: json['meta'] is Map<String, dynamic>
          ? PaginationMeta.fromJson(json['meta'] as Map<String, dynamic>)
          : null,
      errors: json['errors'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['errors'] as Map)
          : const {},
    );
  }
}

class PaginationMeta {
  final int currentPage;
  final int lastPage;
  final int perPage;
  final int total;

  /// Cursor-based pagination (chat). `oldest_cursor` / `newest_cursor` are the
  /// message ids at the edges of the returned page; pass them back as
  /// `before` / `after` to page without unstable offsets.
  final String? oldestCursor;
  final String? newestCursor;
  final bool hasMoreOlder;

  const PaginationMeta({
    this.currentPage = 1,
    this.lastPage = 1,
    this.perPage = 15,
    this.total = 0,
    this.oldestCursor,
    this.newestCursor,
    this.hasMoreOlder = false,
  });

  factory PaginationMeta.fromJson(Map<String, dynamic> json) {
    return PaginationMeta(
      currentPage: json['current_page'] as int? ?? 1,
      lastPage: json['last_page'] as int? ?? 1,
      perPage: json['per_page'] as int? ?? 15,
      total: json['total'] as int? ?? 0,
      oldestCursor: json['oldest_cursor'] as String?,
      newestCursor: json['newest_cursor'] as String?,
      hasMoreOlder: json['has_more_older'] as bool? ?? false,
    );
  }

  static const PaginationMeta empty = PaginationMeta();

  bool get hasMore => currentPage < lastPage;
}

/// Hasil list ter-paginasi.
class Paged<T> {
  final List<T> items;
  final PaginationMeta meta;

  const Paged({required this.items, required this.meta});

  bool get hasMore => meta.hasMore;
}
