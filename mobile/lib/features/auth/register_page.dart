import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import '../../models/university.dart';
import 'auth_controller.dart';
import 'otp_verification_page.dart';
import 'register_options_providers.dart';

/// Form registrasi 3 langkah: Akun → Biodata → Karir.
class RegisterPage extends ConsumerStatefulWidget {
  const RegisterPage({super.key});

  @override
  ConsumerState<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends ConsumerState<RegisterPage> {
  static const _stepTitles = ['Akun & Institusi', 'Biodata', 'Status Karir'];

  final _formKey = GlobalKey<FormState>();
  int _step = 0;
  bool _submitting = false;
  String? _error;

  // Step 1 — akun
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  String? _institutionId;

  // Step 2 — biodata
  final _phoneController = TextEditingController();
  final _nisController = TextEditingController();
  final _nisnController = TextEditingController();
  final _entryYearController = TextEditingController();
  final _gradYearController = TextEditingController();
  final _departmentController = TextEditingController();
  final _addressController = TextEditingController();
  String? _gender;
  String? _birthDate;
  String? _provinceId;
  String? _regencyId;
  String? _districtId;
  String? _provinceName;
  String? _regencyName;
  String? _districtName;

  // Step 3 — karir
  String? _employmentStatus;
  final _companyController = TextEditingController();
  final _positionController = TextEditingController();
  final _workFieldController = TextEditingController();
  String? _workStartYear;
  final _workProvinceController = TextEditingController();
  final _workCityController = TextEditingController();
  String? _studyUniversityId;
  String? _studyUniversityName;
  String? _studyProgramName;
  String? _studyEntryYear;
  final _businessNameController = TextEditingController();
  final _businessFieldController = TextEditingController();
  String? _businessStartYear;
  final _businessProvinceController = TextEditingController();
  final _businessCityController = TextEditingController();
  final _businessAddressController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    _phoneController.dispose();
    _nisController.dispose();
    _nisnController.dispose();
    _entryYearController.dispose();
    _gradYearController.dispose();
    _departmentController.dispose();
    _addressController.dispose();
    _companyController.dispose();
    _positionController.dispose();
    _workFieldController.dispose();
    _workProvinceController.dispose();
    _workCityController.dispose();
    _businessNameController.dispose();
    _businessFieldController.dispose();
    _businessProvinceController.dispose();
    _businessCityController.dispose();
    _businessAddressController.dispose();
    super.dispose();
  }

  bool _validateStep() {
    if (_step == 0) {
      final valid = _formKey.currentState!.validate();
      if (valid && _institutionId == null) {
        setState(() => _error = 'Pilih institusi Anda');
        return false;
      }
      return valid;
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

  /// Validasi semua kolom biodata wajib diisi.
  String? _validateBiodata() {
    if (_gender == null) return 'Pilih jenis kelamin';
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) return 'No HP wajib diisi';
    if (!RegExp(r'^(08|\+62)').hasMatch(phone)) return 'No HP harus diawali 08 atau +62';
    if (phone.length < 10) return 'No HP minimal 10 karakter';
    final nis = _nisController.text.trim();
    if (nis.isEmpty) return 'NIS wajib diisi';
    if (nis.length != 10) return 'NIS harus tepat 10 digit';
    final nisn = _nisnController.text.trim();
    if (nisn.isEmpty) return 'NISN wajib diisi';
    if (nisn.length != 10) return 'NISN harus tepat 10 digit';
    if (_entryYearController.text.trim().isEmpty) return 'Pilih tahun masuk';
    if (_gradYearController.text.trim().isEmpty) return 'Pilih tahun lulus';
    final entryYear = int.tryParse(_entryYearController.text.trim());
    final gradYear = int.tryParse(_gradYearController.text.trim());
    if (entryYear != null && gradYear != null && gradYear - entryYear < 3) {
      return 'Tahun lulus minimal 3 tahun setelah tahun masuk';
    }
    if (_departmentController.text.trim().isEmpty) return 'Pilih jurusan / program studi';
    if (_provinceId == null) return 'Pilih provinsi kelahiran';
    if (_regencyId == null) return 'Pilih kabupaten/kota kelahiran';
    if (_districtId == null) return 'Pilih kecamatan kelahiran';
    if (_birthDate == null) return 'Pilih tanggal lahir';
    if (_addressController.text.trim().isEmpty) return 'Alamat wajib diisi';
    return null;
  }

  /// Validasi pertanyaan lanjutan di langkah karir (step 3).
  bool _validateCareerStep() {
    if (_employmentStatus == null) {
      setState(() => _error = 'Pilih salah satu status karir');
      return false;
    }
    if (_employmentStatus == 'working') {
      if (_companyController.text.trim().isEmpty ||
          _positionController.text.trim().isEmpty ||
          _workFieldController.text.trim().isEmpty ||
          _workStartYear == null ||
          _workProvinceController.text.trim().isEmpty ||
          _workCityController.text.trim().isEmpty) {
        setState(() => _error = 'Lengkapi detail pekerjaan (perusahaan, posisi, bidang usaha, tahun mulai, provinsi & kota kerja)');
        return false;
      }
    }
    if (_employmentStatus == 'continuing_study') {
      if (_studyUniversityId == null) {
        setState(() => _error = 'Pilih universitas');
        return false;
      }
      if (_studyProgramName == null || _studyProgramName!.isEmpty) {
        setState(() => _error = 'Pilih program studi');
        return false;
      }
      if (_studyEntryYear == null || _studyEntryYear!.isEmpty) {
        setState(() => _error = 'Pilih tahun masuk kuliah');
        return false;
      }
    }
    if (_employmentStatus == 'entrepreneur') {
      if (_businessNameController.text.trim().isEmpty ||
          _businessFieldController.text.trim().isEmpty ||
          _businessStartYear == null ||
          _businessProvinceController.text.trim().isEmpty ||
          _businessCityController.text.trim().isEmpty ||
          _businessAddressController.text.trim().isEmpty) {
        setState(() => _error = 'Lengkapi detail usaha (nama, bidang usaha, tahun mulai, provinsi, kota & alamat)');
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
        // Navigasi ke halaman verifikasi OTP.
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => OtpVerificationPage(email: result.email!),
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
      'institution_id': _institutionId,
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
    addInt('entry_year', _entryYearController.text);
    addInt('graduation_year', _gradYearController.text);
    add('department', _departmentController.text);
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
      add('work_province', _workProvinceController.text);
      add('work_city', _workCityController.text);
    } else if (_employmentStatus == 'continuing_study') {
      add('study_institution', _studyUniversityName);
      add('study_program', _studyProgramName);
      addInt('study_entry_year', _studyEntryYear);
    } else if (_employmentStatus == 'entrepreneur') {
      add('business_name', _businessNameController.text);
      add('business_field', _businessFieldController.text);
      addInt('business_start_year', _businessStartYear);
      add('business_province', _businessProvinceController.text);
      add('business_city', _businessCityController.text);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Daftar Akun')),
      body: SafeArea(
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
    );
  }

  // ------------------------------------------------------------------
  // Step 1 — akun & institusi
  // ------------------------------------------------------------------
  Widget _buildStep1() {
    final institutions = ref.watch(institutionOptionsProvider);
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
          'Lengkapi data akun dan pilih institusi Anda.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        const SizedBox(height: 20),
        TextFormField(
          controller: _nameController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Nama Lengkap',
            prefixIcon: Icon(Icons.person_outline_rounded, size: 20),
          ),
          validator: (v) =>
              (v == null || v.trim().isEmpty) ? 'Nama wajib diisi' : null,
        ),
        const SizedBox(height: 14),
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
          obscureText: true,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Password (min. 8 karakter)',
            prefixIcon: Icon(Icons.lock_outline_rounded, size: 20),
          ),
          validator: (v) {
            if (v == null || v.length < 8) return 'Minimal 8 karakter';
            return null;
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
          validator: (v) => (v != _passwordController.text)
              ? 'Password tidak sama'
              : null,
        ),
        const SizedBox(height: 14),
        institutions.when(
          data: (list) => DropdownButtonFormField<String>(
            initialValue: _institutionId,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Institusi',
              prefixIcon: Icon(Icons.school_outlined, size: 20),
            ),
            hint: const Text('Pilih institusi'),
            items: list
                .map((e) => DropdownMenuItem(
                      value: e.id,
                      child: Text(
                        e.name,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ))
                .toList(),
            onChanged: _submitting
                ? null
                : (v) {
                    setState(() {
                      _institutionId = v;
                      _error = null;
                    });
                  },
          ),
          loading: () => Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: const Row(
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                SizedBox(width: 12),
                Text('Memuat daftar institusi…',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 14)),
              ],
            ),
          ),
          error: (e, _) => Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.dangerBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.error_outline_rounded, color: AppColors.danger, size: 18),
                    SizedBox(width: 8),
                    Text('Gagal memuat institusi',
                        style: TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                ),
                const SizedBox(height: 4),
                const Text('Periksa koneksi internet Anda, lalu coba lagi.',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => ref.invalidate(institutionOptionsProvider),
                    icon: const Icon(Icons.refresh_rounded, size: 16),
                    label: const Text('Muat Ulang'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ------------------------------------------------------------------
  // Step 2 — biodata
  // ------------------------------------------------------------------
  Widget _buildStep2() {
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
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'No. HP (contoh: 0812xxxx atau +62...)',
            prefixIcon: Icon(Icons.phone_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _nisController,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'NIS (10 digit)',
                  prefixIcon: Icon(Icons.badge_outlined, size: 20),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextFormField(
                controller: _nisnController,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'NISN (10 digit)',
                  prefixIcon: Icon(Icons.badge_outlined, size: 20),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _entryYearController,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Tahun Masuk'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextFormField(
                controller: _gradYearController,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Tahun Lulus'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _departmentController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Jurusan / Program Studi',
            prefixIcon: Icon(Icons.menu_book_outlined, size: 20),
          ),
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
    const options = [
      ('working', 'Bekerja', Icons.work_outline_rounded),
      ('entrepreneur', 'Wirausaha', Icons.storefront_outlined),
      ('continuing_study', 'Melanjutkan Studi', Icons.school_outlined),
      ('unemployed', 'Belum Bekerja', Icons.hourglass_empty_rounded),
      ('active_student', 'Aktif Kuliah', Icons.menu_book_outlined),
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
        TextFormField(
          controller: _workProvinceController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Provinsi Kerja *',
            prefixIcon: Icon(Icons.map_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _workCityController,
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(
            labelText: 'Kota Kerja *',
            prefixIcon: Icon(Icons.location_city_outlined, size: 20),
          ),
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

    final graduationYear = int.tryParse(_gradYearController.text.trim());
    final currentYear = DateTime.now().year;
    final startYear = graduationYear != null ? graduationYear + 3 : currentYear - 10;
    // Mulai dari lulus + 3 sampai lulus + 6 (atau tahun berjalan jika lebih besar).
    final endYear = currentYear < startYear + 3 ? startYear + 3 : currentYear;
    final studyYears = List.generate(endYear - startYear + 1, (i) => (startYear + i).toString());

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
        TextFormField(
          controller: _businessProvinceController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Provinsi Usaha *',
            prefixIcon: Icon(Icons.map_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _businessCityController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Kota Usaha *',
            prefixIcon: Icon(Icons.location_city_outlined, size: 20),
          ),
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
        Text(message, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
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
