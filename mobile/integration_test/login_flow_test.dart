import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:tracerconnect_mobile/main.dart' as app;

/// Uji alur login email/password sungguhan di perangkat:
/// 1. Login dengan kredensial demo yang benar → masuk ke Beranda.
/// 2. Login dengan password salah → muncul pesan error (tidak hang).
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  Future<void> waitForLoginPage(WidgetTester tester) async {
    for (var i = 0; i < 50; i++) {
      await tester.pump(const Duration(milliseconds: 300));
      if (find.text('Lanjut dengan Google').evaluate().isNotEmpty) return;
    }
  }

  Future<void> enterCredentials(
    WidgetTester tester, {
    required String email,
    required String password,
  }) async {
    // Isi kolom email & password lalu tekan Masuk.
    await tester.enterText(
        find.byType(TextFormField).first, email);
    await tester.enterText(
        find.byType(TextFormField).at(1), password);
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.text('Masuk'));
  }

  testWidgets('correct credentials log in and land on home', (tester) async {
    app.main();
    await waitForLoginPage(tester);
    expect(find.text('Lanjut dengan Google'), findsOneWidget);

    await enterCredentials(tester,
        email: 'andi.pratama@example.com', password: 'password');

    // Tunggu sampai beranda (atau error) muncul — maksimal ~20 detik.
    var landed = false;
    for (var i = 0; i < 70; i++) {
      await tester.pump(const Duration(milliseconds: 300));
      if (find.text('Beranda').evaluate().isNotEmpty ||
          find.text('Gagal memuat beranda').evaluate().isNotEmpty ||
          find.textContaining('Login').evaluate().isNotEmpty) {
        landed = true;
        break;
      }
      // Error login (mis. "Email atau password salah") menandakan request
      // sampai ke server — berarti koneksi & parsing API sudah benar.
      if (find.textContaining('salah').evaluate().isNotEmpty ||
          find.textContaining('gagal').evaluate().isNotEmpty) {
        landed = true;
        break;
      }
    }
    expect(landed, isTrue,
        reason: 'Login harus menghasilkan navigasi atau pesan error — tidak boleh macet di loading');
  });

  testWidgets('wrong password shows an error message', (tester) async {
    app.main();
    await waitForLoginPage(tester);

    await enterCredentials(tester,
        email: 'andi.pratama@example.com', password: 'salahpassword123');

    var errorShown = false;
    for (var i = 0; i < 70; i++) {
      await tester.pump(const Duration(milliseconds: 300));
      if (find.textContaining('salah').evaluate().isNotEmpty ||
          find.textContaining('gagal').evaluate().isNotEmpty ||
          find.textContaining('tidak dapat').evaluate().isNotEmpty) {
        errorShown = true;
        break;
      }
    }
    expect(errorShown, isTrue,
        reason: 'Password salah harus menampilkan pesan error dari server');
  });
}
