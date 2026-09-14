import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/network/api_error.dart';
import '../../core/services/google_signin_service.dart';
import '../../core/theme/app_theme.dart';
import '../../models/region.dart';
import '../../models/university.dart';
import '../../shared/widgets/lag_loader.dart';
import 'auth_controller.dart';
import 'google_register_page.dart';
import 'otp_verification_page.dart';
import 'register_options_providers.dart';

/// Daftar skill tetap — paritas dengan `Register.tsx` (SKILLS).
const List<String> _skillOptions = [
  'JavaScript',
  'PHP',
  'Python',
  'UI/UX Design',
  'Public Speaking',
  'Desain Grafis',
  'Networking',
  'Digital Marketing',
  'Data Analysis',
  'Mobile Development',
];

/// Platform sosial yang diizinkan — paritas dengan `Register.tsx`.
const List<({String value, String label})> _socialPlatforms = [
  (value: 'facebook', label: 'Facebook'),
  (value: 'instagram', label: 'Instagram'),
  (value: 'linkedin', label: 'LinkedIn'),
];

/// Skor kekuatan password 0–4 — paritas `passwordStrength()` di Register.tsx:
/// panjang >= 8, huruf besar, angka, simbol.
({int score, String label}) _passwordStrength(String pw) {
  if (pw.isEmpty) return (score: 0, label: '');
  var score = 0;
  if (pw.length >= 8) score++;
  if (RegExp(r'[A-Z]').hasMatch(pw)) score++;
  if (RegExp(r'\d').hasMatch(pw)) score++;
  if (RegExp(r'[^A-Za-z0-9]').hasMatch(pw)) score++;
  const levels = ['Lemah', 'Cukup', 'Kuat', 'Sangat kuat'];
  return (score: score, label: levels[score - 1]);
}

/// Form registrasi 3 langkah: Akun → Biodata → Karir.
class RegisterPage extends ConsumerStatefulWidget {
  const RegisterPage({super.key});

  @override
  ConsumerState<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends ConsumerState<RegisterPage> {
  static const _stepTitles = ['Informasi Akun', 'Informasi Lanjut', 'Status Karir'];

  final _formKey = GlobalKey<FormState>();
  int _step = 0;
  bool _submitting = false;
  String? _error;

  // Step 1 — akun (nama dikumpulkan di langkah 2, seperti web)
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  String? _institutionId;

  // Step 2 — biodata
  final _phoneController = TextEditingController();
  final _nisController = TextEditingController();
  final _nisnController = TextEditingController();
  String? _entryYear;
  String? _gradYear;
  String? _department;
  final _addressController = TextEditingController();
  String? _gender;
  String? _birthDate;
  String? _provinceId;
  String? _regencyId;
  String? _districtId;
  String? _provinceName;
  String? _regencyName;
  String? _districtName;
  File? _photoFile;
  String? _photoError;
  List<String> _skills = [];
  final Map<String, TextEditingController> _socialUrlControllers = {
    for (final p in _socialPlatforms) p.value: TextEditingController(),
  };

  // Step 3 — karir (provinsi & kota kerja/usaha memakai dropdown wilayah —
  // paritas web yang menyimpan NAMA dari /regions, bukan teks bebas)
  String? _employmentStatus;
  final _companyController = TextEditingController();
  final _positionController = TextEditingController();
  final _workFieldController = TextEditingController();
  String? _workStartYear;
  String? _workProvinceId;
  String? _workProvinceName;
  String? _workCityName;
  String? _studyUniversityId;
  String? _studyUniversityName;
  String? _studyProgramName;
  String? _studyEntryYear;
  final _businessNameController = TextEditingController();
  final _businessFieldController = TextEditingController();
  String? _businessStartYear;
  String? _businessProvinceId;
  String? _businessProvinceName;
  String? _businessCityName;
  final _businessAddressController = TextEditingController();

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    _phoneController.dispose();
    _nisController.dispose();
    _nisnController.dispose();
    _addressController.dispose();
    for (final c in _socialUrlControllers.values) {
      c.dispose();
    }
    _companyController.dispose();
    _positionController.dispose();
    _workFieldController.dispose();
    _businessNameController.dispose();
    _businessFieldController.dispose();
    _businessAddressController.dispose();
    super.dispose();
  }

  bool _validateStep() {
    if (_step == 0) {
      return _formKey.currentState!.validate();
    }
    if (_step == 1) {
      final msg = _validateBiodata();
      if (msg != null) {
        setState(() => _error = msg);
        return false;
      }
      return true;
    }
    return true;
  }

  /// Validasi semua kolom biodata wajib diisi — urutan & pesan sama dengan
  /// `validateStep(2)` di web.
  String? _validateBiodata() {
    if (_nameController.text.trim().isEmpty) return 'Nama lengkap wajib diisi';
    if (_department == null) return 'Pilih jurusan';
    if (_gender == null) return 'Pilih jenis kelamin';
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) return 'No HP wajib diisi';
    if (!RegExp(r'^(08|\+62)').hasMatch(phone)) return 'No HP harus diawali 08 atau +62';
    if (phone.length < 10) return 'No HP minimal 10 karakter';
    final nis = _nisController.text.trim();
    if (nis.isEmpty) return 'NIS wajib diisi';
    if (nis.length != 10) return 'NIS harus tepat 10 karakter';
    final nisn = _nisnController.text.trim();
    if (nisn.isEmpty) return 'NISN wajib diisi';
    if (nisn.length != 10) return 'NISN harus tepat 10 karakter';
    if (_entryYear == null) return 'Pilih tahun masuk';
    if (_gradYear == null) return 'Pilih tahun lulus';
    final entryYear = int.tryParse(_entryYear!);
    final gradYear = int.tryParse(_gradYear!);
    if (entryYear != null && gradYear != null && gradYear - entryYear < 3) {
      return 'Tahun lulus minimal 3 tahun setelah tahun masuk';
    }
    if (_provinceId == null) return 'Pilih provinsi';
    if (_regencyId == null) return 'Pilih kabupaten/kota';
    if (_districtId == null) return 'Pilih kecamatan';
    if (_birthDate == null) return 'Pilih tanggal lahir';
    if (_addressController.text.trim().isEmpty) return 'Alamat wajib diisi';
    return null;
  }

  /// Validasi pertanyaan lanjutan di langkah karir (step 3) — pesan & urutan
  /// sama dengan `validateStep(3)` di web (pesan per-field).
  bool _validateCareerStep() {
    void fail(String message) {
      setState(() => _error = message);
    }

    if (_employmentStatus == null) {
      fail('Pilih salah satu status karir');
      return false;
    }
    if (_employmentStatus == 'working') {
      if (_companyController.text.trim().isEmpty) {
        fail('Nama perusahaan wajib diisi');
        return false;
      }
      if (_positionController.text.trim().isEmpty) {
        fail('Posisi wajib diisi');
        return false;
      }
      if (_workFieldController.text.trim().isEmpty) {
        fail('Bidang usaha wajib diisi');
        return false;
      }
      if (_workStartYear == null) {
        fail('Pilih tahun mulai');
        return false;
      }
      if (_workProvinceName == null || _workProvinceName!.isEmpty) {
        fail('Pilih provinsi kerja');
        return false;
      }
      if (_workCityName == null || _workCityName!.isEmpty) {
        fail('Pilih kota kerja');
        return false;
      }
    }
    if (_employmentStatus == 'continuing_study') {
      if (_studyUniversityId == null) {
        fail('Pilih tempat kuliah');
        return false;
      }
      if (_studyProgramName == null || _studyProgramName!.isEmpty) {
        fail('Pilih program studi');
        return false;
      }
      if (_studyEntryYear == null || _studyEntryYear!.isEmpty) {
        fail('Pilih tahun masuk kuliah');
        return false;
      }
      // Paritas web: tahun masuk kuliah minimal lulus + 3.
      final gradYear = int.tryParse(_gradYear ?? '');
      final studyEntry = int.tryParse(_studyEntryYear!);
      if (gradYear != null && studyEntry != null && studyEntry < gradYear + 3) {
        fail('Tahun masuk kuliah minimal 3 tahun setelah tahun lulus');
        return false;
      }
    }
    if (_employmentStatus == 'entrepreneur') {
      if (_businessNameController.text.trim().isEmpty) {
        fail('Nama usaha wajib diisi');
        return false;
      }
      if (_businessFieldController.text.trim().isEmpty) {
        fail('Bidang usaha wajib diisi');
        return false;
      }
      if (_businessStartYear == null) {
        fail('Pilih tahun mulai');
        return false;
      }
      if (_businessAddressController.text.trim().isEmpty) {
        fail('Alamat usaha wajib diisi');
        return false;
      }
      if (_businessProvinceName == null || _businessProvinceName!.isEmpty) {
        fail('Pilih provinsi usaha');
        return false;
      }
      if (_businessCityName == null || _businessCityName!.isEmpty) {
        fail('Pilih kota usaha');
        return false;
      }
    }
    return true;
  }

  Future<void> _submit() async {
    if (!_validateCareerStep()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(authControllerProvider.notifier)
          .register(_buildPayload());

      if (!mounted) return;

      if (result.requiresVerification) {
        // Navigasi ke halaman verifikasi OTP; foto opsional diunggah
        // setelah verifikasi sukses — paritas alur web.
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => OtpVerificationPage(
              email: result.email!,
              avatarFile: _photoFile,
            ),
          ),
        );
      }
      // Jika session langsung ada, redirect ditangani router (authenticated).
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = firstValidationMessage(e));
    } catch (_) {
      if (mounted) setState(() => _error = 'Registrasi gagal. Silakan coba lagi.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Map<String, dynamic> _buildPayload() {
    final payload = <String, dynamic>{
      'name': _nameController.text.trim(),
      'email': _emailController.text.trim(),
      'password': _passwordController.text,
      'password_confirmation': _confirmController.text,
      // Paritas web: institusi tidak dikirim bila belum dipilih (undefined).
      if (_institutionId != null) 'institution_id': _institutionId,
    };

    void add(String key, String? value) {
      if (value != null && value.trim().isNotEmpty) {
        payload[key] = value.trim();
      }
    }

    void addInt(String key, String? value) {
      if (value != null && value.trim().isNotEmpty) {
        final parsed = int.tryParse(value.trim());
        if (parsed != null) payload[key] = parsed;
      }
    }

    add('gender', _gender);
    add('phone', _phoneController.text);
    add('nis', _nisController.text);
    add('nisn', _nisnController.text);
    addInt('entry_year', _entryYear);
    addInt('graduation_year', _gradYear);
    add('department', _department);

    // Sosial + skill — paritas web: baris dengan URL kosong dibuang.
    final socials = _socialPlatforms
        .map((p) => {
              'platform': p.value,
              'url': (_socialUrlControllers[p.value]?.text ?? '').trim(),
            })
        .where((s) => (s['url'] as String).isNotEmpty)
        .toList();
    if (socials.isNotEmpty) payload['socials'] = socials;
    if (_skills.isNotEmpty) payload['skills'] = _skills;

    add('birth_date', _birthDate);
    add('birthplace', _districtName);
    add('birthplace_province', _provinceName);
    add('birthplace_regency', _regencyName);
    add('address', _addressController.text);
    add('employment_status', _employmentStatus);

    if (_employmentStatus == 'working') {
      add('company_name', _companyController.text);
      add('position', _positionController.text);
      add('business_field', _workFieldController.text);
      addInt('business_start_year', _workStartYear);
      add('work_province', _workProvinceName);
      add('work_city', _workCityName);
    } else if (_employmentStatus == 'continuing_study') {
      add('study_institution', _studyUniversityName);
      add('study_program', _studyProgramName);
      addInt('study_entry_year', _studyEntryYear);
    } else if (_employmentStatus == 'entrepreneur') {
      add('business_name', _businessNameController.text);
      add('business_field', _businessFieldController.text);
      addInt('business_start_year', _businessStartYear);
      add('business_province', _businessProvinceName);
      add('business_city', _businessCityName);
      add('business_address', _businessAddressController.text);
    }

    return payload;
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 22, 1, 1),
      firstDate: DateTime(1940),
      lastDate: now,
    );
    if (picked != null) {
      setState(() {
        _birthDate =
            '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      });
    }
  }

  /// Pilih foto profil opsional — validasi sama seperti web:
  /// harus gambar (PNG/JPG/WebP), maksimal 2 MB.
  Future<void> _googleRegister() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final idToken = await GoogleSignInService.requestIdToken();

      final result =
          await ref.read(authControllerProvider.notifier).googleLogin(idToken);

      if (result.registration != null) {
        if (!mounted) return;
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => GoogleRegisterPage(info: result.registration!),
          ),
        );
        return;
      }
      // Akun sudah lengkap → redirect otomatis ditangani router.
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = firstValidationMessage(e));
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) {
        if (mounted) setState(() => _submitting = false);
        return;
      }
      if (mounted) {
        setState(() => _error = GoogleSignInService.friendlyErrorMessage(e));
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Google Sign-In gagal. Silakan coba lagi.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _pickPhoto() async {
    setState(() => _photoError = null);
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (picked == null) return;
    final ext = picked.name.split('.').last.toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowed.contains(ext)) {
      setState(() => _photoError = 'Format file harus berupa foto (PNG/JPG/WebP)');
      return;
    }
    if (await picked.length() > 2 * 1024 * 1024) {
      setState(() => _photoError = 'Ukuran foto maksimal 2MB');
      return;
    }
    setState(() => _photoFile = File(picked.path));
  }

  void _toggleSkill(String skill) {
    setState(() {
      _skills = _skills.contains(skill)
          ? (_skills.where((s) => s != skill).toList())
          : [..._skills, skill];
    });
  }

  @override
  Widget build(BuildContext context) {
    // Auto-select first institution when data loads — harus di dalam build
    // karena ref.listen hanya boleh dipanggil dari build method ConsumerWidget.
    ref.listen(institutionOptionsProvider, (previous, next) {
      final list = next.valueOrNull;
      if (list != null && list.isNotEmpty && _institutionId == null) {
        setState(() => _institutionId = list.first.id);
      }
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Daftar Akun')),
      body: Stack(
        children: [
          SafeArea(
        child: Column(
          children: [
            // Stepper indicator
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
              child: Row(
                children: List.generate(_stepTitles.length, (i) {
                  final isActive = i == _step;
                  final isDone = i < _step;
                  return Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 250),
                              width: 26,
                              height: 26,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isDone
                                    ? AppColors.success
                                    : (isActive
                                        ? AppColors.primary
                                        : const Color(0xFFE2E8F0)),
                              ),
                              child: Center(
                                child: isDone
                                    ? const Icon(Icons.check_rounded,
                                        size: 16, color: Colors.white)
                                    : Text(
                                        '${i + 1}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: isActive
                                              ? Colors.white
                                              : AppColors.textMuted,
                                        ),
                                      ),
                              ),
                            ),
                            if (i < _stepTitles.length - 1)
                              Expanded(
                                child: Container(
                                  height: 2,
                                  color: isDone
                                      ? AppColors.success
                                      : const Color(0xFFE2E8F0),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _stepTitles[i],
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight:
                                isActive ? FontWeight.w700 : FontWeight.w500,
                            color: isActive
                                ? AppColors.primary
                                : (isDone
                                    ? AppColors.success
                                    : AppColors.textMuted),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_step == 0) _buildStep1(),
                      if (_step == 1) _buildStep2(),
                      if (_step == 2) _buildStep3(),
                      if (_error != null) ...[
                        const SizedBox(height: 16),
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
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          if (_step > 0) ...[
                            Expanded(
                              child: OutlinedButton(
                                onPressed: _submitting
                                    ? null
                                    : () {
                                        setState(() {
                                          _step--;
                                          _error = null;
                                        });
                                      },
                                child: const Text('Kembali'),
                              ),
                            ),
                            const SizedBox(width: 12),
                          ],
                          Expanded(
                            flex: 2,
                            child: FilledButton(
                              onPressed: _submitting
                                  ? null
                                  : () {
                                      if (_step < 2) {
                                        if (_validateStep()) {
                                          setState(() {
                                            _step++;
                                            _error = null;
                                          });
                                        }
                                      } else {
                                        _submit();
                                      }
                                    },
                              child: _submitting
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.4,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(_step < 2 ? 'Lanjut' : 'Daftar'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
          // Lag loading overlay
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

  // ------------------------------------------------------------------
  // Step 1 — akun & institusi
  // ------------------------------------------------------------------
  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Mulai perjalanan tracer study Anda',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Lengkapi data akun Anda.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        const SizedBox(height: 20),
        TextFormField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Email',
            prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
          ),
          validator: (v) {
            final value = v?.trim() ?? '';
            if (!RegExp(r'^\S+@\S+\.\S+$').hasMatch(value)) {
              return 'Masukkan email yang valid';
            }
            return null;
          },
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _passwordController,
          obscureText: true,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Password',
            helperText: 'minimal 8 karakter',
            prefixIcon: Icon(Icons.lock_outline_rounded, size: 20),
          ),
          validator: (v) {
            if (v == null || v.length < 8) return 'Password minimal 8 karakter';
            return null;
          },
        ),
        // Meter kekuatan password — paritas Register.tsx langkah 1.
        ValueListenableBuilder<TextEditingValue>(
          valueListenable: _passwordController,
          builder: (context, value, _) {
            if (value.text.isEmpty) return const SizedBox.shrink();
            final strength = _passwordStrength(value.text);
            const barColors = [
              Color(0xFFF43F5E), // Lemah
              AppColors.warning, // Cukup
              Color(0xFF34D399), // Kuat
              AppColors.success, // Sangat kuat
            ];
            final color = barColors[strength.score - 1];
            return Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: List.generate(4, (i) {
                      return Expanded(
                        child: Container(
                          height: 4,
                          margin: EdgeInsets.only(right: i < 3 ? 6 : 0),
                          decoration: BoxDecoration(
                            color:
                                i < strength.score ? color : AppColors.border,
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    strength.label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: color,
                    ),
                  ),
                ],
              ),
            );
          },
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _confirmController,
          obscureText: true,
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(
            labelText: 'Konfirmasi Password',
            prefixIcon: Icon(Icons.lock_outline_rounded, size: 20),
          ),
          validator: (v) => (v != _passwordController.text || v!.isEmpty)
              ? 'Konfirmasi password tidak cocok'
              : null,
        ),
        const SizedBox(height: 14),
        const SizedBox(height: 20),
        const Row(
          children: [
            Expanded(child: Divider()),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'atau daftar dengan',
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
          onPressed: _submitting ? null : _googleRegister,
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
                  child: CircularProgressIndicator(strokeWidth: 2.4),
                )
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.g_mobiledata_rounded, size: 22, color: Color(0xFF4285F4)),
                    SizedBox(width: 10),
                    Text(
                      'Daftar dengan Google',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
        ),
      ],
    );
  }

  // ------------------------------------------------------------------
  // Step 2 — biodata
  // ------------------------------------------------------------------
  Widget _buildStep2() {
    final currentYear = DateTime.now().year;
    // Tahun masuk: 1990..tahun berjalan — sama seperti web.
    final entryYears = List.generate(currentYear - 1989, (i) => (1990 + i).toString());
    // Tahun lulus mengikuti tahun masuk: min masuk+3, maks masuk+6 atau
    // tahun berjalan (mana yang lebih besar) — paritas web.
    final entry = int.tryParse(_entryYear ?? '') ?? 0;
    final gradStart = entry > 0 ? (1990 > entry + 3 ? 1990 : entry + 3) : 1990;
    final gradEnd = currentYear > entry + 6 ? currentYear : (entry > 0 ? entry + 6 : currentYear);
    final gradYears = gradStart <= gradEnd
        ? List.generate(gradEnd - gradStart + 1, (i) => (gradStart + i).toString())
        : <String>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Lengkapi biodata Anda',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Semua kolom wajib diisi.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        const SizedBox(height: 20),
        TextFormField(
          controller: _nameController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Nama Lengkap *',
            prefixIcon: Icon(Icons.person_outline_rounded, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        Consumer(
          builder: (context, ref, _) {
            final departmentsAsync = ref.watch(departmentOptionsProvider(_institutionId ?? ''));
            return departmentsAsync.when(
              data: (departments) {
                // Clear selection if current department is not in the list
                if (_department != null && !departments.any((d) => d.name == _department)) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (mounted) setState(() => _department = null);
                  });
                }
                return DropdownButtonFormField<String>(
                  initialValue: _department,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Jurusan *',
                    prefixIcon: Icon(Icons.menu_book_outlined, size: 20),
                  ),
                  hint: const Text('Pilih jurusan'),
                  items: departments
                      .map((d) => DropdownMenuItem(value: d.name, child: Text(d.name)))
                      .toList(),
                  onChanged: (v) => setState(() => _department = v),
                );
              },
              loading: () => InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Jurusan *',
                  prefixIcon: Icon(Icons.menu_book_outlined, size: 20),
                  suffixIcon: SizedBox(
                    width: 20,
                    height: 20,
                    child: Padding(
                      padding: EdgeInsets.all(4),
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
                child: const Text('Memuat jurusan…'),
              ),
              error: (e, _) => InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Jurusan *',
                  prefixIcon: Icon(Icons.menu_book_outlined, size: 20),
                  errorText: 'Gagal memuat jurusan',
                ),
                child: const Text('Gagal memuat data'),
              ),
            );
          },
        ),
        const SizedBox(height: 14),
        DropdownButtonFormField<String>(
          initialValue: _gender,
          decoration: const InputDecoration(
            labelText: 'Jenis Kelamin',
            prefixIcon: Icon(Icons.wc_rounded, size: 20),
          ),
          items: const [
            DropdownMenuItem(value: 'male', child: Text('Laki-laki')),
            DropdownMenuItem(value: 'female', child: Text('Perempuan')),
          ],
          onChanged: (v) => setState(() => _gender = v),
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          maxLength: 16,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'No. HP (contoh: 0812xxxx atau +62...)',
            prefixIcon: Icon(Icons.phone_outlined, size: 20),
            counterText: '',
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _nisController,
                keyboardType: TextInputType.number,
                maxLength: 10,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'NIS (10 digit)',
                  prefixIcon: Icon(Icons.badge_outlined, size: 20),
                  counterText: '',
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextFormField(
                controller: _nisnController,
                keyboardType: TextInputType.number,
                maxLength: 10,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'NISN (10 digit)',
                  prefixIcon: Icon(Icons.badge_outlined, size: 20),
                  counterText: '',
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: _entryYear,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Tahun Masuk'),
                hint: const Text('Pilih'),
                items: entryYears
                    .map((y) => DropdownMenuItem(value: y, child: Text(y)))
                    .toList(),
                onChanged: (v) => setState(() {
                  _entryYear = v;
                  // Paritas web: tahun lulus direset bila tidak lagi valid
                  // (tahun masuk dikosongkan, atau lulus < masuk + 3).
                  final grad = int.tryParse(_gradYear ?? '');
                  final entryNew = int.tryParse(v ?? '');
                  if (_gradYear != null &&
                      (entryNew == null || (grad != null && grad < entryNew + 3))) {
                    _gradYear = null;
                  }
                }),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: _gradYear,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Tahun Lulus'),
                hint: Text(entry == 0 ? 'Pilih tahun masuk dulu' : 'Minimal ${entry + 3}'),
                items: gradYears
                    .map((y) => DropdownMenuItem(value: y, child: Text(y)))
                    .toList(),
                onChanged: entry == 0
                    ? null
                    : (v) => setState(() => _gradYear = v),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        _buildBirthDateField(),
        const SizedBox(height: 14),
        _buildBirthplaceRegion(),
        const SizedBox(height: 14),
        TextFormField(
          controller: _addressController,
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Alamat Domisili',
            alignLabelWithHint: true,
            prefixIcon: Icon(Icons.home_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 20),

        // Foto profil opsional (maks 2 MB).
        _buildPhotoField(),
        const SizedBox(height: 20),

        // Skill — pilihan tetap seperti web.
        const Align(
          alignment: Alignment.centerLeft,
          child: Text(
            'Keahlian (pilih yang dimiliki)',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _skillOptions.map((skill) {
            final selected = _skills.contains(skill);
            return FilterChip(
              label: Text(skill),
              selected: selected,
              onSelected: (_) => _toggleSkill(skill),
              labelStyle: TextStyle(
                fontSize: 12,
                color: selected ? Colors.white : AppColors.textSecondary,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
              ),
              selectedColor: AppColors.primary,
              checkmarkColor: Colors.white,
              backgroundColor: AppColors.surface,
              side: BorderSide(
                color: selected ? AppColors.primary : AppColors.border,
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 20),

        // Sosial media — platform tetap, URL opsional.
        const Align(
          alignment: Alignment.centerLeft,
          child: Text(
            'Media Sosial (opsional)',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        const SizedBox(height: 10),
        ..._socialPlatforms.map((p) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: TextFormField(
                controller: _socialUrlControllers[p.value],
                keyboardType: TextInputType.url,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: '${p.label} (URL)',
                  prefixIcon: const Icon(Icons.link_rounded, size: 20),
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildPhotoField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                shape: BoxShape.circle,
                image: _photoFile != null
                    ? DecorationImage(
                        image: FileImage(_photoFile!),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: _photoFile == null
                  ? const Icon(Icons.person_outline_rounded,
                      color: AppColors.primary, size: 30)
                  : null,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _photoFile == null
                        ? 'Foto Profil (opsional)'
                        : 'Foto siap diunggah',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'PNG/JPG/WebP, maksimal 2MB',
                    style: TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      TextButton.icon(
                        onPressed: _pickPhoto,
                        icon: const Icon(Icons.upload_rounded, size: 16),
                        label: const Text('Pilih Foto',
                            style: TextStyle(fontSize: 12)),
                      ),
                      if (_photoFile != null)
                        TextButton.icon(
                          onPressed: () =>
                              setState(() => _photoFile = null),
                          icon: const Icon(Icons.delete_outline_rounded,
                              size: 16),
                          label: const Text('Hapus',
                              style: TextStyle(fontSize: 12)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        if (_photoError != null) ...[
          const SizedBox(height: 6),
          Text(_photoError!,
              style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 12)),
        ],
      ],
    );
  }

  Widget _buildBirthDateField() {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: _pickBirthDate,
      child: InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Tanggal Lahir',
          prefixIcon: Icon(Icons.cake_outlined, size: 20),
        ),
        child: Text(
          _birthDate ?? 'Pilih tanggal',
          style: TextStyle(
            fontSize: 14,
            color: _birthDate == null ? AppColors.textMuted : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _buildBirthplaceRegion() {
    final provinces = ref.watch(provincesProvider);
    final regencies = _provinceId == null
        ? null
        : ref.watch(regenciesProvider(_provinceId!));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        provinces.when(
          data: (list) => DropdownButtonFormField<String>(
            initialValue: _provinceId,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Provinsi Kelahiran',
              prefixIcon: Icon(Icons.map_outlined, size: 20),
            ),
            items: list
                .map((e) => DropdownMenuItem(value: e.id, child: Text(e.name)))
                .toList(),
            onChanged: (v) {
              setState(() {
                _provinceId = v;
                _regencyId = null;
                _districtId = null;
                _provinceName = list
                    .where((e) => e.id == v)
                    .map((e) => e.name)
                    .firstOrNull;
                _regencyName = null;
                _districtName = null;
              });
            },
          ),
          loading: () => DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Provinsi Kelahiran'),
            items: const [],
            onChanged: null,
          ),
          error: (e, _) => _RetryError(
            message: 'Gagal memuat provinsi',
            onRetry: () => ref.invalidate(provincesProvider),
          ),
        ),
        if (regencies != null) ...[
          const SizedBox(height: 14),
          regencies.when(
            data: (list) => DropdownButtonFormField<String>(
              initialValue: _regencyId,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Kabupaten/Kota Kelahiran',
                prefixIcon: Icon(Icons.location_city_outlined, size: 20),
              ),
              items: list
                  .map((e) => DropdownMenuItem(value: e.id, child: Text(e.name)))
                  .toList(),
              onChanged: (v) {
                setState(() {
                  _regencyId = v;
                  _districtId = null;
                  _regencyName =
                      list.where((e) => e.id == v).map((e) => e.name).firstOrNull;
                  _districtName = null;
                });
              },
            ),
            loading: () => DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'Kabupaten/Kota Kelahiran'),
              items: const [],
              onChanged: null,
            ),
            error: (e, _) => _RetryError(
              message: 'Gagal memuat kabupaten/kota',
              onRetry: () => ref.invalidate(regenciesProvider(_provinceId!)),
            ),
          ),
        ],
        if (_regencyId != null) ...[
          const SizedBox(height: 14),
          _buildDistrictDropdown(),
        ],
      ],
    );
  }

  // ------------------------------------------------------------------
  // Step 3 — status karir
  // ------------------------------------------------------------------
  Widget _buildStep3() {
    // Urutan & label sama dengan CAREERS di Register.tsx.
    const options = [
      ('working', 'Bekerja', Icons.work_outline_rounded),
      ('continuing_study', 'Kuliah', Icons.school_outlined),
      ('entrepreneur', 'Wirausaha', Icons.storefront_outlined),
      ('unemployed', 'Mencari Kerja', Icons.hourglass_empty_rounded),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Apa status Anda saat ini?',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Informasi ini membantu institusi menyusun data tracer study.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        const SizedBox(height: 20),
        ...options.map(
          (option) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: _submitting
                  ? null
                  : () => setState(() => _employmentStatus = option.$1),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                decoration: BoxDecoration(
                  color: _employmentStatus == option.$1
                      ? AppColors.primaryLight
                      : AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _employmentStatus == option.$1
                        ? AppColors.primary
                        : AppColors.border,
                    width: _employmentStatus == option.$1 ? 1.6 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      option.$3,
                      size: 22,
                      color: _employmentStatus == option.$1
                          ? AppColors.primary
                          : AppColors.textMuted,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        option.$2,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: _employmentStatus == option.$1
                              ? AppColors.primary
                              : AppColors.textPrimary,
                        ),
                      ),
                    ),
                    Icon(
                      _employmentStatus == option.$1
                          ? Icons.radio_button_checked_rounded
                          : Icons.radio_button_off_rounded,
                      color: _employmentStatus == option.$1
                          ? AppColors.primary
                          : AppColors.textMuted,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),

        // Pertanyaan lanjutan mengikuti status yang dipilih.
        if (_employmentStatus == 'working') ...[const SizedBox(height: 6), _buildWorkingDetails()],
        if (_employmentStatus == 'continuing_study') ...[const SizedBox(height: 6), _buildStudyDetails()],
        if (_employmentStatus == 'entrepreneur') ...[const SizedBox(height: 6), _buildBusinessDetails()],
      ],
    );
  }

  // ------------------------------------------------------------------
  // Detail karir — Bekerja
  // ------------------------------------------------------------------
  Widget _buildWorkingDetails() {
    return _CareerCard(
      title: 'Detail Pekerjaan',
      children: [
        TextFormField(
          controller: _companyController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Nama Perusahaan *',
            prefixIcon: Icon(Icons.business_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _positionController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Posisi / Jabatan *',
            prefixIcon: Icon(Icons.badge_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _workFieldController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Bidang Usaha / Industri *',
            prefixIcon: Icon(Icons.category_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        _buildYearDropdown(
          label: 'Tahun Mulai Bekerja *',
          value: _workStartYear,
          onChanged: (v) => setState(() => _workStartYear = v),
        ),
        const SizedBox(height: 14),
        _buildProvinceSelect(
          label: 'Provinsi Kerja *',
          selectedId: _workProvinceId,
          onChanged: (item) => setState(() {
            // Paritas web: ganti provinsi mengosongkan kota.
            _workProvinceId = item?.id;
            _workProvinceName = item?.name;
            _workCityName = null;
          }),
        ),
        const SizedBox(height: 14),
        _buildRegencySelect(
          label: 'Kota Kerja *',
          provinceId: _workProvinceId,
          selectedName: _workCityName,
          onChanged: (item) => setState(() => _workCityName = item?.name),
        ),
      ],
    );
  }

  // ------------------------------------------------------------------
  // Detail karir — Melanjutkan studi (dropdown universitas + prodi)
  // ------------------------------------------------------------------
  Widget _buildStudyDetails() {
    final programs = _studyUniversityId == null
        ? null
        : ref.watch(studyProgramsProvider(_studyUniversityId!));

    final graduationYear = int.tryParse(_gradYear ?? '');
    final currentYear = DateTime.now().year;
    // Paritas web: mulai max(1990, lulus + 3), fallback tahun berjalan - 10
    // bila tahun lulus belum dipilih; akhir max(tahun berjalan, lulus + 6).
    final startYear = graduationYear != null
        ? (1990 > graduationYear + 3 ? 1990 : graduationYear + 3)
        : currentYear - 10;
    final rawEnd = graduationYear != null ? graduationYear + 6 : startYear;
    final endYear = currentYear > rawEnd ? currentYear : rawEnd;
    final studyYears = endYear >= startYear
        ? List.generate(endYear - startYear + 1, (i) => (startYear + i).toString())
        : <String>[];

    return _CareerCard(
      title: 'Detail Pendidikan Lanjutan',
      children: [
        InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: _pickUniversity,
          child: InputDecorator(
            decoration: const InputDecoration(
              labelText: 'Kuliah di mana? *',
              prefixIcon: Icon(Icons.school_outlined, size: 20),
              suffixIcon: Icon(Icons.search_rounded, size: 20),
            ),
            child: Text(
              _studyUniversityName ?? 'Ketik untuk mencari universitas',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 14,
                color: _studyUniversityName == null
                    ? AppColors.textMuted
                    : AppColors.textPrimary,
              ),
            ),
          ),
        ),
        if (programs != null) ...[const SizedBox(height: 14)],
        if (programs != null)
          programs.when(
            data: (list) => DropdownButtonFormField<String>(
              initialValue: _studyProgramName,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Jurusan / Prodi *',
                prefixIcon: Icon(Icons.menu_book_outlined, size: 20),
              ),
              hint: const Text('Pilih program studi'),
              items: list
                  .map((e) => DropdownMenuItem(
                        value: e.name,
                        child: Text(e.name, overflow: TextOverflow.ellipsis),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _studyProgramName = v),
            ),
            loading: () => DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'Jurusan / Prodi *'),
              hint: const Text('Memuat…'),
              items: const [],
              onChanged: null,
            ),
            error: (e, _) => _RetryError(
              message: 'Gagal memuat daftar prodi',
              onRetry: () => ref.invalidate(studyProgramsProvider(_studyUniversityId!)),
            ),
          ),
        const SizedBox(height: 14),
        DropdownButtonFormField<String>(
          initialValue: _studyEntryYear,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'Kapan masuk kuliah? *',
            prefixIcon: Icon(Icons.calendar_month_outlined, size: 20),
          ),
          hint: Text(
            graduationYear != null ? 'Minimal ${graduationYear + 3}' : 'Pilih tahun',
          ),
          items: studyYears
              .map((y) => DropdownMenuItem(value: y, child: Text(y)))
              .toList(),
          onChanged: (v) => setState(() => _studyEntryYear = v),
        ),
      ],
    );
  }

  // ------------------------------------------------------------------
  // Detail karir — Wirausaha
  // ------------------------------------------------------------------
  Widget _buildBusinessDetails() {
    return _CareerCard(
      title: 'Detail Usaha',
      children: [
        TextFormField(
          controller: _businessNameController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Nama Usaha *',
            prefixIcon: Icon(Icons.storefront_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _businessFieldController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Bidang Usaha *',
            prefixIcon: Icon(Icons.category_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        _buildYearDropdown(
          label: 'Tahun Mulai Usaha *',
          value: _businessStartYear,
          onChanged: (v) => setState(() => _businessStartYear = v),
        ),
        const SizedBox(height: 14),
        _buildProvinceSelect(
          label: 'Provinsi Usaha *',
          selectedId: _businessProvinceId,
          onChanged: (item) => setState(() {
            // Paritas web: ganti provinsi mengosongkan kota.
            _businessProvinceId = item?.id;
            _businessProvinceName = item?.name;
            _businessCityName = null;
          }),
        ),
        const SizedBox(height: 14),
        _buildRegencySelect(
          label: 'Kota Usaha *',
          provinceId: _businessProvinceId,
          selectedName: _businessCityName,
          onChanged: (item) => setState(() => _businessCityName = item?.name),
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _businessAddressController,
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(
            labelText: 'Alamat Usaha *',
            prefixIcon: Icon(Icons.place_outlined, size: 20),
          ),
        ),
      ],
    );
  }

  /// Dropdown provinsi — paritas select "Provinsi Kerja/Usaha" di
  /// Register.tsx (data dari /regions/provinces).
  Widget _buildProvinceSelect({
    required String label,
    required String? selectedId,
    required ValueChanged<RegionItem?> onChanged,
  }) {
    final provinces = ref.watch(provincesProvider);
    return provinces.when(
      data: (list) => DropdownButtonFormField<String>(
        initialValue: selectedId,
        isExpanded: true,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.map_outlined, size: 20),
        ),
        hint: const Text('Pilih provinsi'),
        items: list
            .map((e) => DropdownMenuItem(value: e.id, child: Text(e.name)))
            .toList(),
        onChanged: (v) =>
            onChanged(list.where((e) => e.id == v).toList().firstOrNull),
      ),
      loading: () => DropdownButtonFormField<String>(
        decoration: InputDecoration(labelText: label),
        items: const [],
        onChanged: null,
      ),
      error: (e, _) => _RetryError(
        message: 'Gagal memuat provinsi',
        onRetry: () => ref.invalidate(provincesProvider),
      ),
    );
  }

  /// Dropdown kota/kabupaten tergantung provinsi — paritas web: payload
  /// menyimpan NAMA kota; id diturunkan kembali dari nama (disabled bila
  /// provinsi belum dipilih, dan ikut kosong saat provinsi berganti).
  Widget _buildRegencySelect({
    required String label,
    required String? provinceId,
    required String? selectedName,
    required ValueChanged<RegionItem?> onChanged,
  }) {
    final decoration = InputDecoration(
      labelText: label,
      prefixIcon: const Icon(Icons.location_city_outlined, size: 20),
    );
    if (provinceId == null) {
      return DropdownButtonFormField<String>(
        decoration: decoration,
        hint: const Text('Pilih provinsi dahulu'),
        items: const [],
        onChanged: null,
      );
    }
    final regencies = ref.watch(regenciesProvider(provinceId));
    return regencies.when(
      data: (list) {
        // Paritas web `workCityId`: id dicari dari nama yang tersimpan.
        final currentId = list
            .where((e) => e.name == selectedName)
            .map((e) => e.id)
            .toList()
            .firstOrNull;
        return DropdownButtonFormField<String>(
          initialValue: currentId,
          isExpanded: true,
          decoration: decoration,
          hint: const Text('Pilih kota'),
          items: list
              .map((e) => DropdownMenuItem(value: e.id, child: Text(e.name)))
              .toList(),
          onChanged: (v) =>
              onChanged(list.where((e) => e.id == v).toList().firstOrNull),
        );
      },
      loading: () => DropdownButtonFormField<String>(
        decoration: decoration,
        items: const [],
        onChanged: null,
      ),
      error: (e, _) => _RetryError(
        message: 'Gagal memuat kota/kabupaten',
        onRetry: () => ref.invalidate(regenciesProvider(provinceId)),
      ),
    );
  }

  Widget _buildDistrictDropdown() {
    final districts = ref.watch(districtsProvider(_regencyId!));
    return districts.when(
      data: (list) => DropdownButtonFormField<String>(
        initialValue: _districtId,
        isExpanded: true,
        decoration: const InputDecoration(
          labelText: 'Kecamatan Kelahiran',
          prefixIcon: Icon(Icons.location_on_outlined, size: 20),
        ),
        items: list
            .map((e) => DropdownMenuItem(value: e.id, child: Text(e.name)))
            .toList(),
        onChanged: (v) {
          setState(() {
            _districtId = v;
            _districtName =
                list.where((e) => e.id == v).map((e) => e.name).firstOrNull;
          });
        },
      ),
      loading: () => DropdownButtonFormField<String>(
        decoration: const InputDecoration(labelText: 'Kecamatan Kelahiran'),
        items: const [],
        onChanged: null,
      ),
      error: (e, _) => _RetryError(
        message: 'Gagal memuat kecamatan',
        onRetry: () => ref.invalidate(districtsProvider(_regencyId!)),
      ),
    );
  }

  /// Dropdown tahun (1990..tahun berjalan) untuk "tahun mulai".
  Widget _buildYearDropdown({
    required String label,
    required String? value,
    required ValueChanged<String?> onChanged,
  }) {
    final currentYear = DateTime.now().year;
    final years = List.generate(currentYear - 1989, (i) => (1990 + i).toString());

    return DropdownButtonFormField<String>(
      initialValue: value,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.calendar_month_outlined, size: 20),
      ),
      hint: const Text('Pilih tahun'),
      items: years.map((y) => DropdownMenuItem(value: y, child: Text(y))).toList(),
      onChanged: onChanged,
    );
  }

  /// Buka bottom sheet pencarian universitas — pencarian dijalankan di server
  /// (di-debounce) sehingga dataset nasional (5.000+ kampus) tidak pernah
  /// diunduh sekaligus.
  Future<void> _pickUniversity() async {
    final selected = await showModalBottomSheet<University>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => const _UniversityPicker(),
    );
    if (selected == null || !mounted) return;
    setState(() {
      _studyUniversityId = selected.id;
      _studyUniversityName = selected.name;
      _studyProgramName = null;
    });
  }
}

/// Bottom sheet pencarian universitas — memanggil endpoint /universities
/// dengan ?search= (di-debounce 300ms) dan menampilkan hasil dari server.
class _UniversityPicker extends ConsumerStatefulWidget {
  const _UniversityPicker();

  @override
  ConsumerState<_UniversityPicker> createState() => _UniversityPickerState();
}

class _UniversityPickerState extends ConsumerState<_UniversityPicker> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  String _query = '';

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearch(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final results = ref.watch(universitiesSearchProvider(_query));

    return FractionallySizedBox(
      heightFactor: 0.85,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: TextField(
              controller: _searchController,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: 'Cari universitas…',
                prefixIcon: Icon(Icons.search_rounded),
              ),
              onChanged: _onSearch,
            ),
          ),
          Expanded(
            child: results.when(
              data: (list) => list.isEmpty
                  ? const Center(
                      child: Text('Tidak ditemukan',
                          style: TextStyle(color: AppColors.textSecondary)),
                    )
                  : ListView.builder(
                      itemCount: list.length,
                      itemBuilder: (context, i) {
                        final u = list[i];
                        return ListTile(
                          dense: true,
                          title: Text(
                            u.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          onTap: () => Navigator.of(context).pop(u),
                        );
                      },
                    ),
              loading: () => const Center(
                child: CircularProgressIndicator(),
              ),
              error: (e, _) => _RetryError(
                message: 'Gagal memuat daftar universitas',
                onRetry: () => ref.invalidate(universitiesSearchProvider(_query)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Kartu kecil untuk detail karir di langkah 3 registrasi.
class _CareerCard extends StatelessWidget {
  const _CareerCard({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

/// Pesan error kecil dengan tombol "Coba lagi" — dipakai di form registrasi
/// agar kegagalan memuat opsi (institusi, wilayah, prodi) bisa diulang tanpa
/// keluar dari halaman.
class _RetryError extends StatelessWidget {
  const _RetryError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(message, style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 13)),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded, size: 16),
            label: const Text('Coba lagi'),
          ),
        ),
      ],
    );
  }
}
