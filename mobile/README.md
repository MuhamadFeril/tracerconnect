# TracerConnect Mobile (Flutter)

Aplikasi mobile alumni untuk **TracerConnect** — platform tracer study & alumni
engagement. Aplikasi ini mengonsumsi REST API `backend` (Laravel) di `/api/v1`.

## Fitur

- **Autentikasi** — login (email/password **atau Google**), register 3 langkah
  (akun → biodata → karir), forgot/reset password, logout.
- **Beranda alumni** — sapaan, ringkasan profil alumni, pengumuman, acara,
  lowongan, notifikasi, dan riwayat tracer study.
- **Kuisioner** — daftar survey, isi semua tipe pertanyaan (isian, paragraf,
  pilihan tunggal/ganda, dropdown, rating, angka, tanggal, ya/tidak), logika
  kondisional antar-pertanyaan, simpan draft, kumpulkan jawaban, dan lihat
  kembali jawaban yang sudah dikirim.
- **Career center** — daftar & detail lowongan, buka link lamaran.
- **Acara & Pengumuman** — daftar dan detail.
- **Notifikasi** — daftar, jumlah belum dibaca, tandai dibaca.
- **Jejaring** — direktori alumni, profil alumni, kirim/terima permintaan
  koneksi, blokir, dan lapor.
- **Profil** — lihat & edit profil, upload/hapus foto profil, ganti password,
  daftar pengguna yang diblokir.

## Tech stack

- Flutter (Material 3)
- Riverpod (state management)
- GoRouter (routing + auth guard)
- Dio (HTTP + interceptor token & 401)
- flutter_secure_storage (token)
- image_picker (foto profil)
- url_launcher (buka link lamaran)

## Menjalankan

```bash
cd mobile
flutter pub get
flutter run
```

**Base URL API** default menyesuaikan platform:

| Platform | Base URL |
| --- | --- |
| Android emulator | `http://10.0.2.2:8000/api/v1` |
| iOS simulator / desktop | `http://127.0.0.1:8000/api/v1` |
| Perangkat fisik (USB) | `http://127.0.0.1:8000/api/v1` + `adb reverse` (lihat bawah) |
| Perangkat fisik (Wi-Fi) | isi `--dart-define` IP LAN komputer |

**Perangkat fisik (HP asli, bukan emulator):** `10.0.2.2` TIDAK bekerja —
hanya berlaku di emulator. Cara paling mudah saat HP terhubung USB:

```bash
adb reverse tcp:8000 tcp:8000
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000/api/v1
```

`adb reverse` meneruskan `localhost:8000` di HP ke port 8000 komputer,
sehingga aplikasi bisa memakai backend lokal tanpa IP LAN. Pastikan backend
berjalan (`php artisan serve` di folder `backend`).

Ganti base URL saat build/run:

```bash
flutter run --dart-define=API_BASE_URL=https://api.example.com/api/v1
```

Pastikan backend Laravel berjalan (`php artisan serve` di folder `backend`).

## Login dengan Google

Tombol "Lanjut dengan Google" di halaman login memakai `google_sign_in`:
minta ID token dari Google, lalu kirim ke `POST /auth/google` (alur yang sama
dengan landing web).

- **Client ID Web** (dipakai sebagai `serverClientId`): sudah di-set sebagai
default, bisa diganti saat build:
  ```bash
  flutter run --dart-define=GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
  ```
- **Android**: agar tombol Google berfungsi di Android, buat **OAuth client ID
  Android** di Google Cloud Console (Credentials → Create OAuth client ID →
  Android, isi package name `com.tracerconnect.tracerconnect_mobile` + SHA-1
  debug `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`),
  lalu jalankan dengan:
  ```bash
  flutter run --dart-define=GOOGLE_ANDROID_CLIENT_ID=xxx.apps.googleusercontent.com
  ```
  Alternatif: sambungkan Firebase (`google-services.json`) dan hapus
  `GOOGLE_ANDROID_CLIENT_ID`.
- Akun Google harus **sudah terdaftar** di TracerConnect (email + password)
  sebelum bisa login via Google.

## Verifikasi otomatis di perangkat

Tersedia integration test yang menjalankan aplikasi di emulator/HP asli dan
memastikan tombol Google tampil, daftar institusi termuat dari backend, dan
pencarian universitas mengembalikan hasil:

```bash
adb reverse tcp:8000 tcp:8000
flutter test integration_test -d <device> \
  --dart-define=API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## Catatan platform

- **Android**: minimum SDK 19 (flutter_secure_storage). Letakkan di
  `android/app/build.gradle` → `minSdkVersion 19`. Untuk build release,
  tambahkan izin `INTERNET` di `AndroidManifest.xml` (debug sudah otomatis).
- **Android cleartext**: saat memakai `http://` di development, tambahkan
  `android:usesCleartextTraffic="true"` pada `<application>` di
  `AndroidManifest.xml` (debug), atau gunakan HTTPS di production.
- **iOS**: tambahkan `NSPhotoLibraryUsageDescription` dan
  `NSCameraUsageDescription` di `ios/Runner/Info.plist` untuk upload foto.
- **Token** disimpan aman di Keychain/Keystore via `flutter_secure_storage`.
