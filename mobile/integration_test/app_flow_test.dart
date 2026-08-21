import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:tracerconnect_mobile/core/network/api_client.dart';
import 'package:tracerconnect_mobile/main.dart' as app;

/// Verifikasi alur inti di perangkat asli / emulator:
/// 1. Halaman login menampilkan tombol "Lanjut dengan Google".
/// 2. Form registrasi memuat daftar institusi dari backend (endpoint publik).
/// 3. Pencarian universitas mengembalikan hasil dari server (dataset nasional
///    sudah ter-seed).
///
/// Menjalankan: flutter test integration_test -d <device>
/// (pastikan backend berjalan dan dapat diakses perangkat).
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('login page shows Google button; register loads institutions',
      (tester) async {
    app.main();

    // Tunggu splash selesai (restore sesi) hingga layar login tampil.
    // Beri waktu maksimal ~15 detik untuk pemulihan sesi.
    for (var i = 0; i < 50; i++) {
      await tester.pump(const Duration(milliseconds: 300));
      if (find.text('Lanjut dengan Google').evaluate().isNotEmpty) break;
    }

    // 1) Tombol Google dan tombol Masuk ada di halaman login.
    expect(find.text('Lanjut dengan Google'), findsOneWidget);
    expect(find.text('Masuk'), findsOneWidget);

    // Buka halaman registrasi.
    await tester.tap(find.text('Daftar Sekarang'));
    await tester.pump(const Duration(milliseconds: 400));

    // 2) Daftar institusi dimuat dari backend — dropdown "Pilih institusi"
    //    muncul (bukan teks error "Gagal memuat daftar institusi").
    expect(find.text('Gagal memuat daftar institusi'), findsNothing);
    for (var i = 0; i < 60; i++) {
      await tester.pump(const Duration(milliseconds: 300));
      if (find.text('Pilih institusi').evaluate().isNotEmpty) break;
    }
    expect(find.text('Pilih institusi'), findsOneWidget,
        reason: 'Dropdown institusi harus muncul setelah data dimuat dari backend');
  });

  testWidgets('university search endpoint returns seeded results',
      (tester) async {
    // Uji endpoint publik /universities langsung (tanpa UI) untuk memastikan
    // dataset nasional sudah ter-seed dan dapat dicari dari perangkat.
    final data = await ApiClient.instance.get('/universities', query: {
      'search': 'universitas indonesia',
    });

    final names = (data as List)
        .whereType<Map<String, dynamic>>()
        .map((e) => (e['name'] ?? '') as String)
        .where((name) => name.isNotEmpty)
        .toList();

    expect(names, isNotEmpty,
        reason: 'Pencarian universitas harus mengembalikan hasil dari server');
  });
}
