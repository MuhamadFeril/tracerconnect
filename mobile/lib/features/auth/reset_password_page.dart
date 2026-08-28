import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/lag_loader.dart';
import 'auth_repository.dart';

/// Halaman reset password via OTP — paritas dengan `web/src/pages/ResetPassword.tsx`.
///
/// Email dibawa dari halaman lupa password lewat query param
/// `/reset-password?email=...`. Tanpa email, tampil layar "Email Tidak
/// Ditemukan" seperti di web.
class ResetPasswordPage extends StatefulWidget {
  final String? email;

  const ResetPasswordPage({super.key, this.email});

  @override
  State<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends State<ResetPasswordPage> {
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  final _repo = AuthRepository();
  bool _submitting = false;
  bool _resending = false;
  bool _done = false;
  String? _error;
  bool _showPassword = false;
  bool _showConfirmation = false;

  String get _email => widget.email ?? '';

  @override
  void dispose() {
    _otpController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _resend() async {
    setState(() {
      _error = null;
      _resending = true;
    });
    try {
      await _repo.resendOtp(_email, purpose: 'reset');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kode OTP baru telah dikirim.')),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = firstValidationMessage(e));
    } catch (_) {
      if (mounted) setState(() => _error = 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  Future<void> _submit() async {
    setState(() => _error = null);

    final otp = _otpController.text.trim();
    if (otp.isEmpty || otp.length != 6) {
      setState(() => _error = 'Masukkan kode OTP 6 digit');
      return;
    }
    if (_passwordController.text != _confirmController.text) {
      setState(() => _error = 'Konfirmasi password tidak cocok');
      return;
    }

    setState(() => _submitting = true);
    try {
      await _repo.resetPassword(
        email: _email,
        otp: otp,
        password: _passwordController.text,
        passwordConfirmation: _confirmController.text,
      );
      if (mounted) setState(() => _done = true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = firstValidationMessage(e));
    } catch (_) {
      if (mounted) setState(() => _error = 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset Password')),
      body: Stack(
        children: [
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: _done
                      ? _buildDone()
                      : _email.isEmpty
                          ? _buildMissingEmail()
                          : _buildForm(),
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

  Widget _buildDone() {
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
          child: const Icon(Icons.check_circle_outline_rounded,
              color: AppColors.success, size: 36),
        ),
        const SizedBox(height: 18),
        const Text(
          'Password Berhasil Diubah',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Password Anda telah direset. Silakan masuk dengan password baru.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5),
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: () => context.go('/login'),
          child: const Text('Masuk Sekarang'),
        ),
      ],
    );
  }

  Widget _buildMissingEmail() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: const BoxDecoration(
            color: Color(0xFFFFFBEB),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.warning_amber_rounded,
              color: Color(0xFFF59E0B), size: 36),
        ),
        const SizedBox(height: 18),
        const Text(
          'Email Tidak Ditemukan',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Silakan minta kode OTP reset password terlebih dahulu.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5),
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: () => context.go('/forgot-password'),
          child: const Text('Minta Kode OTP'),
        ),
      ],
    );
  }

  Widget _buildForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Atur Ulang Password',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Buat password baru untuk akun Anda.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5),
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFEEF2FF),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text.rich(
            TextSpan(
              text: 'Mengubah password untuk ',
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
              children: [
                TextSpan(
                  text: _email,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _otpController,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          maxLength: 6,
          textAlign: TextAlign.center,
          autofocus: true,
          style: const TextStyle(
            fontSize: 20,
            letterSpacing: 10,
            fontWeight: FontWeight.w700,
          ),
          decoration: const InputDecoration(
            counterText: '',
            hintText: '\u2022\u2022\u2022\u2022\u2022\u2022',
            labelText: 'Kode OTP *',
          ),
          onChanged: (_) => setState(() {}),
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton(
            onPressed: _resending ? null : _resend,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              _resending ? 'Mengirim ulang\u2026' : 'Kirim ulang kode OTP',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _passwordController,
          obscureText: !_showPassword,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(
            labelText: 'Password Baru *',
            helperText: 'minimal 8 karakter',
            prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
            suffixIcon: IconButton(
              icon: Icon(
                _showPassword
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
                size: 20,
              ),
              onPressed: () => setState(() => _showPassword = !_showPassword),
            ),
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _confirmController,
          obscureText: !_showConfirmation,
          textInputAction: TextInputAction.done,
          onFieldSubmitted: (_) => _submit(),
          decoration: InputDecoration(
            labelText: 'Konfirmasi Password Baru *',
            helperText: 'ulangi password yang sama',
            prefixIcon: const Icon(Icons.verified_user_outlined, size: 20),
            suffixIcon: IconButton(
              icon: Icon(
                _showConfirmation
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
                size: 20,
              ),
              onPressed: () =>
                  setState(() => _showConfirmation = !_showConfirmation),
            ),
          ),
          onChanged: (_) => setState(() {}),
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
              : const Text('Simpan Password Baru'),
        ),
      ],
    );
  }
}
