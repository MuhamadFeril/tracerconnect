import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_repository.dart';

enum _PasswordMode { current, otp }

class ChangePasswordPage extends StatefulWidget {
  const ChangePasswordPage({super.key});

  @override
  State<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends State<ChangePasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _currentController = TextEditingController();
  final _otpController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  _PasswordMode _mode = _PasswordMode.current;
  bool _submitting = false;
  bool _otpSending = false;
  bool _otpSent = false;
  String? _error;

  @override
  void dispose() {
    _currentController.dispose();
    _otpController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _switchMode(_PasswordMode next) {
    setState(() {
      _mode = next;
      _error = null;
      _otpSent = false;
      _otpController.clear();
    });
  }

  Future<void> _sendOtp() async {
    setState(() {
      _otpSending = true;
      _error = null;
    });
    try {
      await AuthRepository().sendPasswordChangeOtp();
      if (!mounted) return;
      setState(() => _otpSent = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kode OTP telah dikirim ke email Anda')),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = firstValidationMessage(e));
    } catch (_) {
      if (mounted) setState(() => _error = 'Gagal mengirim OTP. Coba lagi.');
    } finally {
      if (mounted) setState(() => _otpSending = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      if (_mode == _PasswordMode.current) {
        await AuthRepository().updatePassword(
          currentPassword: _currentController.text,
          newPassword: _newController.text,
          newPasswordConfirmation: _confirmController.text,
        );
      } else {
        if (!_otpSent) {
          if (mounted) setState(() => _error = 'Kirim kode OTP terlebih dahulu');
          return;
        }
        await AuthRepository().changePasswordWithOtp(
          otp: _otpController.text.trim(),
          newPassword: _newController.text,
          newPasswordConfirmation: _confirmController.text,
        );
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password berhasil diubah')),
      );
      context.pop();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = firstValidationMessage(e));
    } catch (_) {
      if (mounted) setState(() => _error = 'Gagal mengubah password. Coba lagi.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Widget _modeTab(_PasswordMode value, String label) {
    final selected = _mode == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => _switchMode(value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : AppColors.textSecondary,
              fontSize: 12.5,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isOtp = _mode == _PasswordMode.otp;
    return Scaffold(
      appBar: AppBar(title: const Text('Ubah Password')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Gunakan password baru yang kuat dan tidak dipakai di layanan lain.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5),
            ),
            const SizedBox(height: 16),
            // Mode switch
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  _modeTab(_PasswordMode.current, 'Password Lama'),
                  _modeTab(_PasswordMode.otp, 'Via Email (OTP)'),
                ],
              ),
            ),
            if (isOtp) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  'Kode OTP akan dikirim ke email Anda — tanpa perlu password lama.',
                  style: TextStyle(color: AppColors.primary, fontSize: 12.5, height: 1.4),
                ),
              ),
            ],
            const SizedBox(height: 20),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  if (!isOtp) ...[
                    TextFormField(
                      controller: _currentController,
                      obscureText: true,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Password Saat Ini',
                        prefixIcon: Icon(Icons.lock_outline_rounded, size: 20),
                      ),
                      validator: (v) => (v == null || v.isEmpty)
                          ? 'Password saat ini wajib diisi'
                          : null,
                    ),
                    const SizedBox(height: 14),
                  ] else ...[
                    TextFormField(
                      controller: _otpController,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(
                        labelText: 'Kode OTP',
                        prefixIcon: const Icon(Icons.sms_outlined, size: 20),
                        counterText: '',
                        suffixIcon: TextButton(
                          onPressed: _otpSending ? null : _sendOtp,
                          child: _otpSending
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : Text(_otpSent ? 'Kirim Ulang' : 'Kirim Kode'),
                        ),
                      ),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) {
                          return 'Kode OTP wajib diisi';
                        }
                        if (v.trim().length != 6) {
                          return 'Kode OTP harus 6 digit';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                  ],
                  TextFormField(
                    controller: _newController,
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
                        (v != _newController.text) ? 'Password tidak sama' : null,
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
                        : Text(isOtp ? 'Ubah dengan OTP' : 'Ubah Password'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
