import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/lag_loader.dart';
import 'auth_repository.dart';

/// Lupa password — paritas dengan `web/src/pages/ForgotPassword.tsx`.
///
/// Backend mengirim **kode OTP** (bukan link). Setelah terkirim, pengguna
/// diarahkan ke `/reset-password?email=...` dengan email terbawa. Tombol
/// kirim memiliki hitung mundur 5 detik seperti rate limiter web.
class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  static const int _cooldownSeconds = 5;

  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _repo = AuthRepository();
  bool _submitting = false;
  String? _error;
  bool _sent = false;
  int _cooldown = 0;
  Timer? _cooldownTimer;

  @override
  void dispose() {
    _emailController.dispose();
    _cooldownTimer?.cancel();
    super.dispose();
  }

  void _startCooldown() {
    setState(() => _cooldown = _cooldownSeconds);
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return timer.cancel();
      setState(() => _cooldown = (_cooldown - 1).clamp(0, _cooldownSeconds));
      if (_cooldown <= 0) timer.cancel();
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await _repo.forgotPassword(_emailController.text);
      if (mounted) setState(() => _sent = true);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _error = firstValidationMessage(e));
        _startCooldown();
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lupa Password')),
      body: Stack(
        children: [
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: _sent ? _buildSuccess() : _buildForm(),
                ),
              ),
            ),
          ),
          if (_submitting)
            Positioned.fill(
              child: Container(
                color: Colors.white.withValues(alpha: 0.85),
                child: const LagLoader(
                  label: 'Lagi nge-lag nih, nyambungin',
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSuccess() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: const BoxDecoration(
            color: AppColors.successBg,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.mark_email_read_outlined,
              color: AppColors.success, size: 36),
        ),
        const SizedBox(height: 18),
        const Text(
          'Kode OTP Terkirim',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Jika email terdaftar, kode OTP reset password telah dikirim. '
          'Silakan periksa kotak masuk (dan folder spam) Anda, lalu masukkan '
          'kode beserta password baru.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5),
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: () =>
              context.push('/reset-password?email=${Uri.encodeComponent(_emailController.text.trim())}'),
          child: const Text('Masukkan Kode OTP'),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () => context.go('/login'),
          child: const Text('Kembali ke login'),
        ),
      ],
    );
  }

  Widget _buildForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Reset Password',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Masukkan email akun Anda — kami akan mengirimkan link untuk mengatur ulang password.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5),
        ),
        const SizedBox(height: 24),
        Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _submit(),
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
                ),
                validator: (v) {
                  final value = v?.trim() ?? '';
                  if (value.isEmpty) return 'Email wajib diisi';
                  if (!RegExp(r'^\S+@\S+\.\S+$').hasMatch(value)) {
                    return 'Masukkan email yang valid';
                  }
                  return null;
                },
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _error!,
                    style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer, fontSize: 13),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed:
                    (_submitting || _cooldown > 0) ? null : _submit,
                child: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.4,
                          color: Colors.white,
                        ),
                      )
                    : Text(_cooldown > 0
                        ? 'Tunggu ${_cooldown}s'
                        : 'Kirim Link Reset'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
