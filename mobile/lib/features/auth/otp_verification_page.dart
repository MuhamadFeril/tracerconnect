import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import 'auth_controller.dart';

/// Halaman verifikasi OTP setelah registrasi.
///
/// Menerima [email] dari halaman registrasi dan memanggil
/// `POST /auth/verify-otp` untuk mengaktifkan akun.
///
/// Jika [avatarFile] diberikan (dari langkah registrasi), foto akan
/// diunggah otomatis setelah verifikasi berhasil — paritas alur web.
class OtpVerificationPage extends ConsumerStatefulWidget {
  const OtpVerificationPage({
    super.key,
    required this.email,
    this.avatarFile,
  });

  final String email;

  /// Foto profil opsional yang dipilih saat registrasi.
  final File? avatarFile;

  @override
  ConsumerState<OtpVerificationPage> createState() =>
      _OtpVerificationPageState();
}

class _OtpVerificationPageState extends ConsumerState<OtpVerificationPage> {
  static const int _resendCooldownSeconds = 10;

  final _otpController = TextEditingController();
  bool _submitting = false;
  String? _error;
  bool _resending = false;
  int _resendCooldown = 0;
  Timer? _cooldownTimer;

  @override
  void dispose() {
    _otpController.dispose();
    _cooldownTimer?.cancel();
    super.dispose();
  }

  /// Jeda kirim ulang 10 detik — paritas rate limiter web (`/auth/resend-otp`).
  void _startResendCooldown() {
    setState(() => _resendCooldown = _resendCooldownSeconds);
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return timer.cancel();
      setState(() =>
          _resendCooldown = (_resendCooldown - 1).clamp(0, _resendCooldownSeconds));
      if (_resendCooldown <= 0) timer.cancel();
    });
  }

  Future<void> _verify() async {
    final otp = _otpController.text.trim();
    if (otp.length != 6) {
      setState(() => _error = 'Masukkan kode OTP 6 digit');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await ref
          .read(authControllerProvider.notifier)
          .verifyOtp(widget.email, otp);

      // Unggah foto profil bila ada (best-effort, tidak boleh gagalkan
      // proses registrasi — paritas alur web).
      if (widget.avatarFile != null) {
        try {
          final repo = ref.read(authRepositoryProvider);
          final updatedUser = await repo.uploadAvatar(widget.avatarFile!);
          ref.read(authControllerProvider.notifier).updateUser(updatedUser);
        } catch (_) {
          // Avatar upload gagal — tidak masalah, user bisa upload nanti.
        }
      }

      // Redirect ditangani oleh router (status auth berubah → authenticated).
    } on ApiException catch (e) {
      // Paritas web `apiError()`: pesan validasi per-field diprioritaskan.
      if (mounted) setState(() => _error = firstValidationMessage(e));
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Verifikasi gagal. Silakan coba lagi.');
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _resend() async {
    if (_resendCooldown > 0) return;
    setState(() {
      _resending = true;
      _error = null;
    });

    try {
      await ref
          .read(authControllerProvider.notifier)
          .resendOtp(widget.email);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kode OTP baru telah dikirim ke email Anda'),
            backgroundColor: AppColors.success,
          ),
        );
        _startResendCooldown();
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _error = firstValidationMessage(e));
        _startResendCooldown();
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Gagal mengirim ulang OTP');
      }
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verifikasi Email')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 32),
              // Icon
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.mark_email_read_outlined,
                  size: 36,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Verifikasi Email',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              RichText(
                textAlign: TextAlign.center,
                text: TextSpan(
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 14,
                    height: 1.5,
                  ),
                  children: [
                    const TextSpan(
                      text: 'Kami telah mengirim kode OTP 6 digit ke\n',
                    ),
                    TextSpan(
                      text: widget.email,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const TextSpan(
                      text:
                          '\nMasukkan kode tersebut untuk mengaktifkan akun Anda.',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // OTP input
              TextFormField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: 6,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(6),
                ],
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 12,
                ),
                decoration: const InputDecoration(
                  labelText: 'Kode OTP',
                  counterText: '',
                  prefixIcon: Icon(Icons.pin_outlined, size: 20),
                ),
                onChanged: (_) => setState(() => _error = null),
              ),
              const SizedBox(height: 20),

              // Error
              if (_error != null) ...[
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
                const SizedBox(height: 16),
              ],

              // Verify button
              FilledButton(
                onPressed: _submitting ? null : _verify,
                child: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.4,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Verifikasi Akun'),
              ),
              const SizedBox(height: 20),

              // Resend + back
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    onPressed:
                        (_resending || _resendCooldown > 0) ? null : _resend,
                    child: Text(
                      _resending
                          ? 'Mengirim\u2026'
                          : _resendCooldown > 0
                              ? 'Kirim ulang dalam ${_resendCooldown}s'
                              : 'Kirim ulang kode',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(
                      'Ganti email',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
