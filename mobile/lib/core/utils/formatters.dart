/// Helper format tanggal & teks bergaya Indonesia.
class Formatters {
  Formatters._();

  static const List<String> _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];

  /// Parse ISO-8601 (atau `YYYY-MM-DD`) menjadi DateTime lokal, null bila gagal.
  static DateTime? parseDate(String? value) {
    if (value == null || value.isEmpty) return null;
    final parsed = DateTime.tryParse(value);
    return parsed?.toLocal();
  }

  static String formatDate(DateTime? date) {
    if (date == null) return '—';
    return '${date.day} ${_months[date.month - 1]} ${date.year}';
  }

  static String formatDateFromString(String? value) =>
      formatDate(parseDate(value));

  static String formatDateTime(DateTime? date) {
    if (date == null) return '—';
    final hh = date.hour.toString().padLeft(2, '0');
    final mm = date.minute.toString().padLeft(2, '0');
    return '${formatDate(date)}, $hh.$mm';
  }

  static String formatDateTimeFromString(String? value) =>
      formatDateTime(parseDate(value));

  /// Inisial nama untuk fallback avatar, mis. "Budi Santoso" → "BS".
  static String initials(String? name) {
    if (name == null || name.trim().isEmpty) return '?';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length == 1) {
      return parts.first.substring(0, 1).toUpperCase();
    }
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
        .toUpperCase();
  }

  /// Format nilai jawaban survey agar mudah dibaca.
  static String formatAnswerValue(dynamic value) {
    if (value == null) return '';
    if (value is List) {
      return value.map((e) => e.toString()).join(', ');
    }
    if (value is bool) return value ? 'Ya' : 'Tidak';
    return value.toString();
  }
}
