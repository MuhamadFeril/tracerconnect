import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../core/constants/app_constants.dart';
import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import 'auth_controller.dart';

/// Logo Google 4 warna sederhana (biru-merah-kuning-hijau) untuk tombol login.
class _GoogleLogo extends StatelessWidget {
  const _GoogleLogo();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 20,
      child: CustomPaint(painter: _GoogleLogoPainter()),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final c = Offset(w / 2, h / 2);
    final r = w * 0.38;
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.16
      ..strokeCap = StrokeCap.round;

    // Biru (kiri-atas)
    stroke.color = const Color(0xFF4285F4);
    canvas.drawArc(Rect.fromCircle(center: c, radius: r), -0.6, 1.6, false, stroke);
    // Merah (kanan-atas)
    stroke.color = const Color(0xFFEA4335);
    canvas.drawArc(Rect.fromCircle(center: c, radius: r), 1.7, 1.2, false, stroke);
    // Kuning (kiri-bawah)
    stroke.color = const Color(0xFFFBBC05);
    canvas.drawArc(Rect.fromCircle(center: c, radius: r), 3.9, 0.9, false, stroke);
    // Hijau (kanan-bawah)
    stroke.color = const Color(0xFF34A853);
    canvas.drawArc(Rect.fromCircle(center: c, radius: r), 2.9, 0.9, false, stroke);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscure = true;
  bool _submitting = false;
  String? _error;
  DateTime? _lastSubmitTime;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    // Client-side cooldown: min 3 seconds between attempts.
    if (_lastSubmitTime != null && DateTime.now().difference(_lastSubmitTime!) < const Duration(seconds: 3)) {
      setState(() => _error = 'Terlalu cepat. Silakan tunggu beberapa detik.');
      return;
    }
    FocusScope.of(context).unfocus();
    _lastSubmitTime = DateTime.now();
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref
          .read(authControllerProvider.notifier)
          .login(_emailController.text, _passwordController.text);
      // Redirect otomatis ditangani router setelah status berubah.
    } on ApiException catch (e) {
      setState(() => _error = firstValidationMessage(e));
    } catch (_) {
      setState(() => _error = 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// "Lanjut dengan Google" — alur yang sama dengan tombol Google di landing
  /// web: minta ID token via `google_sign_in`, kirim ke `POST /auth/google`,
  /// lalu simpan sesi (token + user). Akun harus sudah terdaftar dulu.
  Future<void> _googleLogin() async {
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final googleSignIn = GoogleSignIn.instance;
      await googleSignIn.initialize(
        // `clientId` = client OAuth Android (bila dibuat di Google Cloud
        // Console tanpa Firebase). `serverClientId` = client OAuth Web yang
        // dipakai backend untuk memverifikasi ID token.
        clientId: AppConstants.googleAndroidClientId.isNotEmpty
            ? AppConstants.googleAndroidClientId
            : null,
        serverClientId: AppConstants.googleClientId,
      );

      // Logout dulu agar selalu muncul pemilih akun Google.
      await googleSignIn.signOut();
      final account = await googleSignIn.authenticate();
      final idToken = account.authentication.idToken;

      if (idToken == null || idToken.isEmpty) {
        throw const GoogleSignInException(
          code: GoogleSignInExceptionCode.unknownError,
          description: 'Tidak mendapat ID token dari Google',
        );
      }

      await ref.read(authControllerProvider.notifier).googleLogin(idToken);
      // Redirect otomatis ditangani router setelah status berubah.
    } on ApiException catch (e) {
      setState(() => _error = firstValidationMessage(e));
    } on GoogleSignInException catch (e) {
      // Berikan pesan yang lebih spesifik berdasarkan jenis error.
      String message;
      switch (e.code) {
        case GoogleSignInExceptionCode.canceled:
          // User membatalkan pemilihan akun — jangan tampilkan error.
          if (mounted) setState(() => _submitting = false);
          return;

        default:
          if (AppConstants.googleAndroidClientId.isEmpty &&
              (e.description?.contains(' clientId') == true ||
               e.description?.contains('sign_in') == true)) {
            message = 'Google Sign-In belum dikonfigurasi untuk Android. '
                'Hubungi administrator atau jalankan dengan --dart-define=GOOGLE_ANDROID_CLIENT_ID=<client_id>.';
          } else {
            message = 'Google Sign-In gagal: ${e.description ?? 'periksa konfigurasi client ID Google'}. '
                'Pastikan backend berjalan dan akun sudah terdaftar.';
          }
          break;
      }
      setState(() => _error = message);
    } catch (_) {
      setState(() => _error = 'Google Sign-In gagal. Silakan coba lagi.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Brand
                  Center(
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [AppColors.primaryDark, AppColors.primary],
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.3),
                            blurRadius: 18,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: const Icon(Icons.school_rounded,
                          color: Colors.white, size: 38),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Selamat Datang Kembali',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Masuk untuk mengisi tracer study dan terhubung dengan alumni.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 28),
                  // Form
                  Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          autofillHints: const [AutofillHints.email],
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                            labelText: 'Email',
                            prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
                          ),
                          validator: (v) {
                            final value = v?.trim() ?? '';
                            if (value.isEmpty) return 'Email wajib diisi';
                            if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value)) {
                              return 'Format email tidak valid';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscure,
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                            suffixIcon: IconButton(
                              onPressed: () => setState(() => _obscure = !_obscure),
                              icon: Icon(
                                _obscure
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                                size: 20,
                              ),
                            ),
                          ),
                          validator: (v) =>
                              (v == null || v.isEmpty) ? 'Password wajib diisi' : null,
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.dangerBg,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline_rounded,
                                    color: AppColors.danger, size: 18),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _error!,
                                    style: const TextStyle(
                                      color: AppColors.danger,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 20),
                        FilledButton(
                          onPressed: _submitting ? null : _submit,
                          child: _submitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.4,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Masuk'),
                        ),
                        const SizedBox(height: 20),
                        const Row(
                          children: [
                            Expanded(child: Divider()),
                            Padding(
                              padding: EdgeInsets.symmetric(horizontal: 12),
                              child: Text(
                                'atau',
                                style: TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            Expanded(child: Divider()),
                          ],
                        ),
                        const SizedBox(height: 20),
                        OutlinedButton(
                          onPressed: _submitting ? null : _googleLogin,
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size.fromHeight(48),
                            side: const BorderSide(color: AppColors.border),
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.textPrimary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: _submitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.4,
                                  ),
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    _GoogleLogo(),
                                    SizedBox(width: 10),
                                    Text(
                                      'Lanjut dengan Google',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Align(
                    alignment: Alignment.center,
                    child: TextButton(
                      onPressed: () => context.push('/forgot-password'),
                      child: const Text('Lupa password?'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'Belum punya akun?',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                      ),
                      TextButton(
                        onPressed: () => context.push('/register'),
                        child: const Text('Daftar Sekarang'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
