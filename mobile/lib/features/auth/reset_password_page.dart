import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import 'auth_repository.dart';

/// Halaman reset password. Token & email dapat diisi otomatis lewat
/// query parameter: `/reset-password?email=...&token=...`.
class ResetPasswordPage extends StatefulWidget {
  final String? email;
  final String? token;

  const ResetPasswordPage({super.key, this.email, this.token});

  @override
  State<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends State<ResetPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _emailController;
  late final TextEditingController _tokenController;
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  final _repo = AuthRepository();
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(text: widget.email ?? '');
    _tokenController = TextEditingController(text: widget.token ?? '');
  }

  @override
  void dispose() {
    _emailController.dispose();
    _tokenController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await _repo.resetPassword(
        email: _emailController.text,
        token: _tokenController.text,
        password: _passwordController.text,
        passwordConfirmation: _confirmController.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password berhasil direset. Silakan login.')),
      );
      context.go('/login');
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Buat Password Baru',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Masukkan token dari email reset beserta password baru Anda.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: AppColors.textSecondary, fontSize: 13, height: 1.5),
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
                      ),
                      validator: (v) => (v == null || v.trim().isEmpty)
                          ? 'Email wajib diisi'
                          : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _tokenController,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Token Reset',
                        prefixIcon: Icon(Icons.vpn_key_outlined, size: 20),
                      ),
                      validator: (v) => (v == null || v.trim().isEmpty)
                          ? 'Token wajib diisi'
                          : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Password Baru (min. 8 karakter)',
                        prefixIcon: Icon(Icons.lock_outline_rounded, size: 20),
                      ),
                      validator: (v) =>
                          (v == null || v.length < 8) ? 'Minimal 8 karakter' : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _confirmController,
                      obscureText: true,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _submit(),
                      decoration: const InputDecoration(
                        labelText: 'Konfirmasi Password Baru',
                        prefixIcon: Icon(Icons.lock_outline_rounded, size: 20),
                      ),
                      validator: (v) =>
                          (v != _passwordController.text) ? 'Password tidak sama' : null,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.dangerBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: AppColors.danger, fontSize: 13),
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
                          : const Text('Reset Password'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
