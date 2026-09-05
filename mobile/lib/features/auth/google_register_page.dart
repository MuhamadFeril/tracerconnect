import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/lag_loader.dart';
import 'auth_controller.dart';
import 'auth_repository.dart';
import 'otp_verification_page.dart';
import 'register_options_providers.dart';

/// Layar pelengkapan biodata untuk akun Google baru.
///
/// Sesuai alur web (`Register.tsx` mode Google), akun Google wajib mengisi
/// SELURUH biodata institusi (langkah 1) dan status karir (langkah 2)
/// sebelum diverifikasi via OTP. Backend menerbitkan `registration_token`
/// (server-signed, bukan Google ID token) yang dibawa ke layar ini lalu
/// dikirim ke `POST /auth/google/complete-registration`.
class GoogleRegisterPage extends ConsumerStatefulWidget {
  const GoogleRegisterPage({super.key, required this.info});

  final GoogleRegistrationInfo info;

  @override
  ConsumerState<GoogleRegisterPage> createState() => _GoogleRegisterPageState();
}

class _GoogleRegisterPageState extends ConsumerState<GoogleRegisterPage> {
  static const _stepTitles = ['Biodata', 'Status Karir'];

  final _formKey = GlobalKey<FormState>();
  int _step = 0;
  bool _submitting = false;
  String? _error;

  // Langkah 1 — biodata & institusi
  String? _institutionId;
  final _nameController = TextEditingController();
  String? _department;
  String? _gender;
  final _phoneController = TextEditingController();
  final _nisController = TextEditingController();
  final _nisnController = TextEditingController();
  String? _entryYear;
  String? _gradYear;
  String? _birthDate;
  String? _provinceId;
  String? _regencyId;
  String? _districtId;
  String? _provinceName;
  String? _regencyName;
  String? _districtName;
  final _addressController = TextEditingController();

  // Langkah 2 — status karir
  String? _employmentStatus;
  final _companyController = TextEditingController();
  final _positionController = TextEditingController();
  final _workFieldController = TextEditingController();
  String? _workStartYear;
  String? _workProvinceId;
  String? _workProvinceName;
  String? _workCityName;
  final _studyInstitutionController = TextEditingController();
  final _studyProgramController = TextEditingController();
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
    _nameController.text = widget.info.name;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _nisController.dispose();
    _nisnController.dispose();
    _addressController.dispose();
    _companyController.dispose();
    _positionController.dispose();
    _workFieldController.dispose();
    _studyInstitutionController.dispose();
    _studyProgramController.dispose();
    _businessNameController.dispose();
    _businessFieldController.dispose();
    _businessAddressController.dispose();
    super.dispose();
  }

  /* ---------------------------------------------------------------- */
  /* Validasi (paritas pesan & aturan dengan Register.tsx mode Google)*/
  /* ---------------------------------------------------------------- */

  String? _validateBiodata() {
    if (_nameController.text.trim().isEmpty) return 'Nama lengkap wajib diisi';
    if (_department == null || _department!.isEmpty) return 'Pilih jurusan';
    if (_gender == null || _gender!.isEmpty) return 'Pilih jenis kelamin';
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) return 'No HP wajib diisi';
    if (!RegExp(r'^(08|\+62)').hasMatch(phone)) {
      return 'No HP harus diawali 08 atau +62';
    }
    if (phone.length < 10) return 'No HP minimal 10 karakter';
    final nis = _nisController.text.trim();
    if (nis.isEmpty) return 'NIS wajib diisi';
    if (nis.length != 10) return 'NIS harus tepat 10 karakter';
    final nisn = _nisnController.text.trim();
    if (nisn.isEmpty) return 'NISN wajib diisi';
    if (nisn.length != 10) return 'NISN harus tepat 10 karakter';
    if (_entryYear == null) return 'Pilih tahun masuk';
    if (_gradYear == null) return 'Pilih tahun lulus';
    if (_entryYear != null &&
        _gradYear != null &&
        int.parse(_gradYear!) - int.parse(_entryYear!) < 3) {
      return 'Tahun lulus minimal 3 tahun setelah tahun masuk';
    }
    if (_provinceId == null) return 'Pilih provinsi';
    if (_regencyId == null) return 'Pilih kabupaten/kota';
    if (_districtId == null) return 'Pilih kecamatan';
    if (_birthDate == null) return 'Pilih tanggal lahir';
    if (_addressController.text.trim().isEmpty) return 'Alamat wajib diisi';
    return null;
  }

  String? _validateCareer() {
    if (_employmentStatus == null) return 'Pilih salah satu status karir';
    if (_employmentStatus == 'working') {
      if (_companyController.text.trim().isEmpty) {
        return 'Nama perusahaan wajib diisi';
      }
      if (_positionController.text.trim().isEmpty) return 'Posisi wajib diisi';
      if (_workFieldController.text.trim().isEmpty) {
        return 'Bidang usaha wajib diisi';
      }
      if (_workStartYear == null) return 'Pilih tahun mulai';
      if (_workProvinceName == null || _workProvinceName!.isEmpty) {
        return 'Pilih provinsi kerja';
      }
      if (_workCityName == null || _workCityName!.isEmpty) {
        return 'Pilih kota kerja';
      }
    } else if (_employmentStatus == 'continuing_study') {
      if (_studyInstitutionController.text.trim().isEmpty) {
        return 'Pilih tempat kuliah';
      }
      if (_studyProgramController.text.trim().isEmpty) {
        return 'Pilih program studi';
      }
      if (_studyEntryYear == null) return 'Pilih tahun masuk kuliah';
      final grad = int.tryParse(_gradYear ?? '');
      final study = int.tryParse(_studyEntryYear!);
      if (grad != null && study != null && study < grad + 3) {
        return 'Tahun masuk kuliah minimal 3 tahun setelah tahun lulus';
      }
    } else if (_employmentStatus == 'entrepreneur') {
      if (_businessNameController.text.trim().isEmpty) {
        return 'Nama usaha wajib diisi';
      }
      if (_businessFieldController.text.trim().isEmpty) {
        return 'Bidang usaha wajib diisi';
      }
      if (_businessStartYear == null) return 'Pilih tahun mulai';
      if (_businessAddressController.text.trim().isEmpty) {
        return 'Alamat usaha wajib diisi';
      }
      if (_businessProvinceName == null || _businessProvinceName!.isEmpty) {
        return 'Pilih provinsi usaha';
      }
      if (_businessCityName == null || _businessCityName!.isEmpty) {
        return 'Pilih kota usaha';
      }
    }
    return null;
  }

  bool _validateStep() {
    final msg = _step == 0 ? _validateBiodata() : _validateCareer();
    if (msg != null) {
      setState(() => _error = msg);
      return false;
    }
    return true;
  }

  Map<String, dynamic> _buildPayload() {
    final payload = <String, dynamic>{
      'institution_id': _institutionId,
      'name': _nameController.text.trim(),
      'gender': _gender,
      'phone': _phoneController.text.trim(),
      'nis': _nisController.text.trim(),
      'nisn': _nisnController.text.trim(),
      if (_entryYear != null) 'entry_year': int.parse(_entryYear!),
      if (_gradYear != null) 'graduation_year': int.parse(_gradYear!),
      'department': _department,
      'birth_date': _birthDate,
      'birthplace': _districtName,
      'birthplace_province': _provinceName,
      'birthplace_regency': _regencyName,
      'address': _addressController.text.trim(),
    };

    void add(String key, String? value) {
      if (value != null && value.trim().isNotEmpty) {
        payload[key] = value.trim();
      }
    }

    add('employment_status', _employmentStatus);
    if (_employmentStatus == 'working') {
      add('company_name', _companyController.text);
      add('position', _positionController.text);
      add('business_field', _workFieldController.text);
      if (_workStartYear != null) {
        payload['business_start_year'] = int.parse(_workStartYear!);
      }
      add('work_province', _workProvinceName);
      add('work_city', _workCityName);
    } else if (_employmentStatus == 'continuing_study') {
      add('study_institution', _studyInstitutionController.text);
      add('study_program', _studyProgramController.text);
      if (_studyEntryYear != null) {
        payload['study_entry_year'] = int.parse(_studyEntryYear!);
      }
    } else if (_employmentStatus == 'entrepreneur') {
      add('business_name', _businessNameController.text);
      add('business_field', _businessFieldController.text);
      if (_businessStartYear != null) {
        payload['business_start_year'] = int.parse(_businessStartYear!);
      }
      add('business_address', _businessAddressController.text);
      add('business_province', _businessProvinceName);
      add('business_city', _businessCityName);
    }

    return payload;
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(authControllerProvider.notifier)
          .completeGoogleRegistration(
            widget.info.registrationToken,
            _buildPayload(),
          );

      if (!mounted) return;

      if (result.requiresVerification && result.email != null) {
        await Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => OtpVerificationPage(email: result.email!),
          ),
        );
        return;
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = firstValidationMessage(e));
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Gagal menyimpan biodata. Silakan coba lagi.');
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
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
      appBar: AppBar(title: const Text('Lengkapi Akun Google')),
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              children: [
                _buildStepper(),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (_step == 0) _buildBiodataStep(),
                          if (_step == 1) _buildCareerStep(),
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
                              if (_step > 0)
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: _submitting
                                        ? null
                                        : () => setState(() {
                                              _step--;
                                              _error = null;
                                            }),
                                    child: const Text('Kembali'),
                                  ),
                                ),
                              if (_step > 0) const SizedBox(width: 12),
                              Expanded(
                                flex: 2,
                                child: FilledButton(
                                  onPressed: _submitting
                                      ? null
                                      : () {
                                          if (_validateStep()) {
                                            if (_step < 1) {
                                              setState(() {
                                                _step++;
                                                _error = null;
                                              });
                                            } else {
                                              _submit();
                                            }
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
                                      : Text(_step < 1
                                          ? 'Lanjut'
                                          : 'Simpan & Verifikasi OTP'),
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

  Widget _buildStepper() {
    // Langkah pemilihan institusi dihapus — label tanpa "& Institusi".
    const titles = _stepTitles;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
      child: Row(
        children: List.generate(titles.length, (i) {
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
                  titles[i],
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                    color: isActive
                        ? AppColors.primary
                        : (isDone ? AppColors.success : AppColors.textMuted),
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  /* ---------------------------------------------------------------- */
  /* Langkah 1 — biodata & institusi                                  */
  /* ---------------------------------------------------------------- */

  Widget _buildBiodataStep() {
    final currentYear = DateTime.now().year;
    final years =
        List.generate(currentYear - 1989, (i) => (1990 + i).toString());
    // Langkah pemilihan institusi dihapus dari registrasi mobile: institusi
    // pertama (satu-satunya yang aktif di deployment tenan tunggal) dipilih
    // otomatis agar dropdown jurusan & scoping data tetap bekerja.
    ref.listen(institutionOptionsProvider, (previous, next) {
      final list = next.valueOrNull;
      if (list != null && list.isNotEmpty && _institutionId == null) {
        setState(() => _institutionId = list.first.id);
      }
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.primaryLight,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const Icon(Icons.account_circle_outlined,
                  color: AppColors.primary, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Akun Google terdeteksi',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      widget.info.email,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
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
          'Semua kolom bertanda wajib diisi.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        const SizedBox(height: 18),
        TextFormField(
          controller: _nameController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Nama Lengkap *',
            prefixIcon: Icon(Icons.person_outline_rounded, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        _buildDepartmentField(),
        const SizedBox(height: 14),
        DropdownButtonFormField<String>(
          initialValue: _gender,
          decoration: const InputDecoration(
            labelText: 'Jenis Kelamin *',
            prefixIcon: Icon(Icons.wc_rounded, size: 20),
          ),
          hint: const Text('Pilih'),
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
            labelText: 'No. HP (contoh: 0812xxxx / +62...) *',
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
                  labelText: 'NIS (10 digit) *',
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
                  labelText: 'NISN (10 digit) *',
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
                decoration: const InputDecoration(labelText: 'Tahun Masuk *'),
                hint: const Text('Pilih'),
                items: years
                    .map((y) => DropdownMenuItem(value: y, child: Text(y)))
                    .toList(),
                onChanged: (v) => setState(() {
                  _entryYear = v;
                  _gradYear = null;
                }),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: _gradYear,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Tahun Lulus *'),
                hint: const Text('Pilih'),
                items: years
                    .map((y) => DropdownMenuItem(value: y, child: Text(y)))
                    .toList(),
                onChanged: (v) => setState(() => _gradYear = v),
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
            labelText: 'Alamat Domisili *',
            alignLabelWithHint: true,
            prefixIcon: Icon(Icons.home_outlined, size: 20),
          ),
        ),
      ],
    );
  }

  Widget _buildDepartmentField() {
    final departmentsAsync =
        ref.watch(departmentOptionsProvider(_institutionId ?? ''));
    return departmentsAsync.when(
      data: (departments) {
        if (_department != null &&
            !departments.any((d) => d.name == _department)) {
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
              .map((d) =>
                  DropdownMenuItem(value: d.name, child: Text(d.name)))
              .toList(),
          onChanged: (v) => setState(() => _department = v),
        );
      },
      loading: () => const InputDecorator(
        decoration: InputDecoration(
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
        child: Text('Memuat jurusan…'),
      ),
      error: (e, _) => const InputDecorator(
        decoration: InputDecoration(
          labelText: 'Jurusan *',
          prefixIcon: Icon(Icons.menu_book_outlined, size: 20),
          errorText: 'Gagal memuat jurusan',
        ),
        child: Text('Gagal memuat data'),
      ),
    );
  }

  Widget _buildBirthDateField() {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: _pickBirthDate,
      child: InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Tanggal Lahir *',
          prefixIcon: Icon(Icons.cake_outlined, size: 20),
        ),
        child: Text(
          _birthDate ?? 'Pilih tanggal',
          style: TextStyle(
            fontSize: 14,
            color: _birthDate == null
                ? AppColors.textMuted
                : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _buildBirthplaceRegion() {
    final provinces = ref.watch(provincesProvider);
    final regencies =
        _provinceId == null ? null : ref.watch(regenciesProvider(_provinceId!));
    final districts =
        _regencyId == null ? null : ref.watch(districtsProvider(_regencyId!));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        provinces.when(
          data: (list) => DropdownButtonFormField<String>(
            initialValue: _provinceId,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Provinsi Kelahiran *',
              prefixIcon: Icon(Icons.map_outlined, size: 20),
            ),
            hint: const Text('Pilih provinsi'),
            items: list
                .map((e) =>
                    DropdownMenuItem(value: e.id, child: Text(e.name)))
                .toList(),
            onChanged: (v) => setState(() {
              _provinceId = v;
              _regencyId = null;
              _districtId = null;
              _provinceName = list
                  .where((e) => e.id == v)
                  .map((e) => e.name)
                  .firstOrNull;
              _regencyName = null;
              _districtName = null;
            }),
          ),
          loading: () => DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Provinsi Kelahiran *'),
            items: [],
            onChanged: null,
          ),
          error: (e, _) => OutlinedButton.icon(
            onPressed: () => ref.invalidate(provincesProvider),
            icon: const Icon(Icons.refresh_rounded, size: 16),
            label: const Text('Muat ulang provinsi'),
          ),
        ),
        if (regencies != null) ...[
          const SizedBox(height: 14),
          regencies.when(
            data: (list) => DropdownButtonFormField<String>(
              initialValue: _regencyId,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Kabupaten/Kota Kelahiran *',
                prefixIcon: Icon(Icons.location_city_outlined, size: 20),
              ),
              hint: const Text('Pilih kabupaten/kota'),
              items: list
                  .map((e) =>
                      DropdownMenuItem(value: e.id, child: Text(e.name)))
                  .toList(),
              onChanged: (v) => setState(() {
                _regencyId = v;
                _districtId = null;
                _regencyName = list
                    .where((e) => e.id == v)
                    .map((e) => e.name)
                    .firstOrNull;
                _districtName = null;
              }),
            ),
            loading: () => DropdownButtonFormField<String>(
              decoration:
                  InputDecoration(labelText: 'Kabupaten/Kota Kelahiran *'),
              items: const [],
              onChanged: null,
            ),
            error: (e, _) => OutlinedButton.icon(
              onPressed: () =>
                  ref.invalidate(regenciesProvider(_provinceId!)),
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text('Muat ulang kabupaten/kota'),
            ),
          ),
        ],
        if (districts != null) ...[
          const SizedBox(height: 14),
          districts.when(
            data: (list) => DropdownButtonFormField<String>(
              initialValue: _districtId,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Kecamatan Kelahiran *',
                prefixIcon: Icon(Icons.signpost_outlined, size: 20),
              ),
              hint: const Text('Pilih kecamatan'),
              items: list
                  .map((e) =>
                      DropdownMenuItem(value: e.id, child: Text(e.name)))
                  .toList(),
              onChanged: (v) => setState(() {
                _districtId = v;
                _districtName = list
                    .where((e) => e.id == v)
                    .map((e) => e.name)
                    .firstOrNull;
              }),
            ),
            loading: () => DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'Kecamatan Kelahiran *'),
              items: const [],
              onChanged: null,
            ),
            error: (e, _) => OutlinedButton.icon(
              onPressed: () => ref.invalidate(districtsProvider(_regencyId!)),
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text('Muat ulang kecamatan'),
            ),
          ),
        ],
      ],
    );
  }

  /* ---------------------------------------------------------------- */
  /* Langkah 2 — status karir                                         */
  /* ---------------------------------------------------------------- */

  Widget _buildCareerStep() {
    const options = [
      ('working', 'Bekerja', Icons.work_outline_rounded),
      ('continuing_study', 'Kuliah', Icons.school_outlined),
      ('entrepreneur', 'Wirausaha', Icons.storefront_outlined),
      ('unemployed', 'Mencari Kerja', Icons.hourglass_empty_rounded),
    ];

    final currentYear = DateTime.now().year;
    final workYears = List.generate(currentYear - 1989,
        (i) => (currentYear - i).toString()).reversed.toList();
    final grad = int.tryParse(_gradYear ?? '');
    final studyStart = grad != null ? grad + 3 : (currentYear - 10);
    final studyEnd = (currentYear > (grad ?? currentYear) + 6)
        ? currentYear
        : (grad ?? currentYear) + 6;
    final studyYears = studyStart <= studyEnd
        ? List.generate(
            studyEnd - studyStart + 1, (i) => (studyStart + i).toString())
        : <String>[];

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
        const SizedBox(height: 18),
        ...options.map(
          (option) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: _submitting
                  ? null
                  : () => setState(() => _employmentStatus = option.$1),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
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
        if (_employmentStatus == 'working') ...[
          const SizedBox(height: 6),
          _buildWorkingDetails(workYears),
        ],
        if (_employmentStatus == 'continuing_study') ...[
          const SizedBox(height: 6),
          _buildStudyDetails(studyYears),
        ],
        if (_employmentStatus == 'entrepreneur') ...[
          const SizedBox(height: 6),
          _buildBusinessDetails(workYears),
        ],
      ],
    );
  }

  Widget _buildWorkingDetails(List<String> workYears) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
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
            prefixIcon: Icon(Icons.work_history_outlined, size: 20),
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
        DropdownButtonFormField<String>(
          initialValue: _workStartYear,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Tahun Mulai Bekerja *'),
          hint: const Text('Pilih tahun'),
          items: workYears
              .map((y) => DropdownMenuItem(value: y, child: Text(y)))
              .toList(),
          onChanged: (v) => setState(() => _workStartYear = v),
        ),
        const SizedBox(height: 14),
        _buildWorkRegion(),
      ],
    );
  }

  Widget _buildWorkRegion() {
    final provinces = ref.watch(provincesProvider);
    final regencies = _workProvinceId == null
        ? null
        : ref.watch(regenciesProvider(_workProvinceId!));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        provinces.when(
          data: (list) => DropdownButtonFormField<String>(
            initialValue: _workProvinceId,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Provinsi Kerja *',
              prefixIcon: Icon(Icons.map_outlined, size: 20),
            ),
            hint: const Text('Pilih provinsi'),
            items: list
                .map((e) =>
                    DropdownMenuItem(value: e.id, child: Text(e.name)))
                .toList(),
            onChanged: (v) => setState(() {
              _workProvinceId = v;
              _workProvinceName = list
                  .where((e) => e.id == v)
                  .map((e) => e.name)
                  .firstOrNull;
              _workCityName = null;
            }),
          ),
          loading: () => DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Provinsi Kerja *'),
            items: [],
            onChanged: null,
          ),
          error: (e, _) => OutlinedButton.icon(
            onPressed: () => ref.invalidate(provincesProvider),
            icon: const Icon(Icons.refresh_rounded, size: 16),
            label: const Text('Muat ulang provinsi'),
          ),
        ),
        if (regencies != null) ...[
          const SizedBox(height: 14),
          regencies.when(
            data: (list) => DropdownButtonFormField<String>(
              initialValue: null,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Kota Kerja *',
                prefixIcon: Icon(Icons.location_city_outlined, size: 20),
              ),
              hint: const Text('Pilih kota'),
              items: list
                  .map((e) =>
                      DropdownMenuItem(value: e.name, child: Text(e.name)))
                  .toList(),
              onChanged: (v) => setState(() => _workCityName = v),
            ),
            loading: () => DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'Kota Kerja *'),
              items: const [],
              onChanged: null,
            ),
            error: (e, _) => OutlinedButton.icon(
              onPressed: () =>
                  ref.invalidate(regenciesProvider(_workProvinceId!)),
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text('Muat ulang kota'),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStudyDetails(List<String> studyYears) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextFormField(
          controller: _studyInstitutionController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Kuliah di mana? *',
            prefixIcon: Icon(Icons.school_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _studyProgramController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Jurusan / Prodi *',
            prefixIcon: Icon(Icons.menu_book_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        DropdownButtonFormField<String>(
          initialValue: _studyEntryYear,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'Kapan masuk kuliah? *',
          ),
          hint: const Text('Pilih tahun'),
          items: studyYears
              .map((y) => DropdownMenuItem(value: y, child: Text(y)))
              .toList(),
          onChanged: (v) => setState(() => _studyEntryYear = v),
        ),
      ],
    );
  }

  Widget _buildBusinessDetails(List<String> workYears) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
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
        DropdownButtonFormField<String>(
          initialValue: _businessStartYear,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Tahun Mulai Usaha *'),
          hint: const Text('Pilih tahun'),
          items: workYears
              .map((y) => DropdownMenuItem(value: y, child: Text(y)))
              .toList(),
          onChanged: (v) => setState(() => _businessStartYear = v),
        ),
        const SizedBox(height: 14),
        _buildBusinessRegion(),
        const SizedBox(height: 14),
        TextFormField(
          controller: _businessAddressController,
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Alamat Usaha *',
            alignLabelWithHint: true,
            prefixIcon: Icon(Icons.home_outlined, size: 20),
          ),
        ),
      ],
    );
  }

  Widget _buildBusinessRegion() {
    final provinces = ref.watch(provincesProvider);
    final regencies = _businessProvinceId == null
        ? null
        : ref.watch(regenciesProvider(_businessProvinceId!));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        provinces.when(
          data: (list) => DropdownButtonFormField<String>(
            initialValue: _businessProvinceId,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Provinsi Usaha *',
              prefixIcon: Icon(Icons.map_outlined, size: 20),
            ),
            hint: const Text('Pilih provinsi'),
            items: list
                .map((e) =>
                    DropdownMenuItem(value: e.id, child: Text(e.name)))
                .toList(),
            onChanged: (v) => setState(() {
              _businessProvinceId = v;
              _businessProvinceName = list
                  .where((e) => e.id == v)
                  .map((e) => e.name)
                  .firstOrNull;
              _businessCityName = null;
            }),
          ),
          loading: () => DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Provinsi Usaha *'),
            items: [],
            onChanged: null,
          ),
          error: (e, _) => OutlinedButton.icon(
            onPressed: () => ref.invalidate(provincesProvider),
            icon: const Icon(Icons.refresh_rounded, size: 16),
            label: const Text('Muat ulang provinsi'),
          ),
        ),
        if (regencies != null) ...[
          const SizedBox(height: 14),
          regencies.when(
            data: (list) => DropdownButtonFormField<String>(
              initialValue: null,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Kota Usaha *',
                prefixIcon: Icon(Icons.location_city_outlined, size: 20),
              ),
              hint: const Text('Pilih kota'),
              items: list
                  .map((e) =>
                      DropdownMenuItem(value: e.name, child: Text(e.name)))
                  .toList(),
              onChanged: (v) => setState(() => _businessCityName = v),
            ),
            loading: () => DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'Kota Usaha *'),
              items: const [],
              onChanged: null,
            ),
            error: (e, _) => OutlinedButton.icon(
              onPressed: () =>
                  ref.invalidate(regenciesProvider(_businessProvinceId!)),
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text('Muat ulang kota'),
            ),
          ),
        ],
      ],
    );
  }
}
