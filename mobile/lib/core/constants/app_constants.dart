import 'api_config.dart';

/// Konstanta global aplikasi TracerConnect.
class AppConstants {
  AppConstants._();

  // Cached resolved URLs (populated by [init]).
  static String? _cachedBaseUrl;
  static String? _cachedOrigin;

  /// Initialize cached API URLs. Call once at app startup.
  static Future<void> init() async {
    _cachedBaseUrl = await resolveApiBaseUrl();
    _cachedOrigin = _cachedBaseUrl!.replaceAll(RegExp(r'/api/v1$'), '');
  }

  /// Base URL API (termasuk `/api/v1`).
  ///
  /// Falls back to platform defaults if [init] hasn't been called yet.
  static String get apiBaseUrl {
    if (_cachedBaseUrl != null) return _cachedBaseUrl!;
    // Synchronous fallback before async init completes
    const defined = String.fromEnvironment('API_BASE_URL');
    if (defined.isNotEmpty) return defined;
    return 'https://tracceralumni.freehosting.dev/api/v1';
  }

  /// Asal host (tanpa `/api/v1`) untuk melengkapi URL aset relatif.
  static String get apiOrigin {
    if (_cachedOrigin != null) return _cachedOrigin!;
    return apiBaseUrl.replaceAll(RegExp(r'/api/v1$'), '');
  }

  /// Lengkapi URL aset (avatar, dsb.) bila server mengembalikan path relatif
  /// seperti `/storage/avatars/x.jpg`.
  static String resolveAssetUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return '$apiOrigin${path.startsWith('/') ? path : '/$path'}';
  }

  // -------------------------------------------------------------------
  // Label bahasa Indonesia untuk nilai enum dari backend
  // -------------------------------------------------------------------

  static const Map<String, String> employmentStatusLabels = {
    'working': 'Bekerja',
    'unemployed': 'Belum Bekerja',
    'entrepreneur': 'Wirausaha',
    'continuing_study': 'Melanjutkan Studi',
    'active_student': 'Aktif Kuliah',
  };

  static String employmentStatusLabel(String? key) => employmentStatusLabels[key] ?? 'Belum Diketahui';

  static const Map<String, String> employmentTypeLabels = {
    'full_time': 'Full Time',
    'part_time': 'Part Time',
    'internship': 'Magang',
    'contract': 'Kontrak',
    'freelance': 'Freelance',
  };

  static String employmentTypeLabel(String? key) => employmentTypeLabels[key] ?? 'Lowongan';

  static const Map<String, String> questionTypeLabels = {
    'short_text': 'Isian Singkat',
    'long_text': 'Paragraf',
    'textarea': 'Paragraf',
    'single_choice': 'Pilihan Tunggal',
    'multiple_choice': 'Pilihan Ganda',
    'dropdown': 'Dropdown',
    'rating': 'Rating',
    'scale': 'Skala',
    'number': 'Angka',
    'date': 'Tanggal',
    'year': 'Tahun',
    'boolean': 'Ya/Tidak',
    'yes_no': 'Ya/Tidak',
    'file': 'File',
    'employment_status': 'Status Kerja',
    'salary_range': 'Rentang Gaji',
    'location': 'Lokasi',
  };

  static String questionTypeLabel(String? key) => questionTypeLabels[key] ?? key ?? 'Pertanyaan';

  static const Map<String, String> responseStatusLabels = {
    'in_progress': 'Draft',
    'submitted': 'Selesai',
    'expired': 'Kedaluwarsa',
  };

  static String responseStatusLabel(String? key) => responseStatusLabels[key] ?? key ?? '-';

  static const Map<String, String> surveyItemStatusLabels = {
    'not_started': 'Belum Diisi',
    'in_progress': 'Sedang Diisi',
    'submitted': 'Selesai',
    'expired': 'Kedaluwarsa',
  };

  static String surveyItemStatusLabel(String? key) => surveyItemStatusLabels[key] ?? key ?? '-';

  static const Map<String, String> connectionStatusLabels = {
    'none': 'Belum Terhubung',
    'pending_outgoing': 'Menunggu',
    'pending_incoming': 'Menunggu Anda',
    'connected': 'Terhubung',
  };

  static String connectionStatusLabel(String? key) => connectionStatusLabels[key] ?? key ?? '-';

  /// Client ID Google OAuth **Web**.
  ///
  /// Dipakai sebagai `serverClientId` oleh `google_sign_in`: ID token yang
  /// dihasilkan ber-audience ke client ini, lalu diverifikasi backend dengan
  /// nilai `GOOGLE_CLIENT_ID` di `.env`. **Wajib persis sama** dengan backend
  /// dan web — kalau berbeda, login Google selalu gagal "Token Google tidak
  /// valid atau kedaluwarsa" (audience mismatch).
  /// Nilai bisa diganti saat build:
  /// `flutter run --dart-define=GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com`
  static const String googleClientId = String.fromEnvironment(
    'GOOGLE_CLIENT_ID',
    defaultValue: '399383365196-nloll6plpftp2q2fk5h9rn11qevqsejf.apps.googleusercontent.com',
  );

  /// Client ID OAuth khusus iOS/macOS. TIDAK dipakai di Android —
  /// google_sign_in 7.x mengabaikan `clientId` di sana; aplikasi Android
  /// dikenali dari package name + SHA-1 signing key yang terdaftar sebagai
  /// OAuth client type "Android" di Google Cloud Console. Kosong = tidak dikirim.
  static const String googleIosClientId = String.fromEnvironment(
    'GOOGLE_IOS_CLIENT_ID',
    defaultValue: '',
  );

  /// Kunci `--dart-define` untuk base URL (didokumentasikan di README).
  static const String apiBaseUrlDefine = 'API_BASE_URL';
}
