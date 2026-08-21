import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_constants.dart';
import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/user.dart';
import '../auth/auth_controller.dart';
import '../auth/auth_repository.dart';

/// Form edit profil: data akun + biodata alumni + keahlian & media sosial.
class EditProfilePage extends ConsumerStatefulWidget {
  const EditProfilePage({super.key});

  @override
  ConsumerState<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends ConsumerState<EditProfilePage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _birthplaceController;
  late final TextEditingController _addressController;
  late final TextEditingController _skillController;

  String? _gender;
  String? _birthDate;
  String? _employmentStatus;

  final List<TextEditingController> _socialPlatformControllers = [];
  final List<TextEditingController> _socialUrlControllers = [];
  final List<String> _skills = [];

  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authControllerProvider).user;
    final alumni = user?.alumni;

    _nameController = TextEditingController(text: user?.name ?? '');
    _emailController = TextEditingController(text: user?.email ?? '');
    _phoneController = TextEditingController(text: alumni?.phone ?? user?.phone ?? '');
    _birthplaceController =
        TextEditingController(text: alumni?.birthplaceLabel ?? alumni?.birthplace ?? user?.birthplace ?? '');
    _addressController = TextEditingController(text: alumni?.address ?? user?.address ?? '');
    _skillController = TextEditingController();
    _gender = alumni?.gender ?? user?.gender;
    _birthDate = alumni?.birthDate ?? user?.birthDate;
    _employmentStatus = alumni?.employmentStatus;
    _skills.addAll(alumni?.skills ?? const []);

    for (final social in alumni?.socials ?? const <SocialLink>[]) {
      _socialPlatformControllers.add(TextEditingController(text: social.platform));
      _socialUrlControllers.add(TextEditingController(text: social.url));
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _birthplaceController.dispose();
    _addressController.dispose();
    _skillController.dispose();
    for (final c in _socialPlatformControllers) {
      c.dispose();
    }
    for (final c in _socialUrlControllers) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final initial = Formatters.parseDate(_birthDate) ?? DateTime(now.year - 22, 1, 1);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
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

  void _addSocialRow() {
    setState(() {
      _socialPlatformControllers.add(TextEditingController());
      _socialUrlControllers.add(TextEditingController());
    });
  }

  void _removeSocialRow(int index) {
    setState(() {
      _socialPlatformControllers.removeAt(index).dispose();
      _socialUrlControllers.removeAt(index).dispose();
    });
  }

  void _addSkill() {
    final skill = _skillController.text.trim();
    if (skill.isEmpty || _skills.contains(skill)) return;
    setState(() {
      _skills.add(skill);
      _skillController.clear();
    });
  }

  Map<String, dynamic> _buildPayload() {
    final socials = <Map<String, String>>[];
    for (var i = 0; i < _socialPlatformControllers.length; i++) {
      final platform = _socialPlatformControllers[i].text.trim();
      final url = _socialUrlControllers[i].text.trim();
      if (platform.isNotEmpty && url.isNotEmpty) {
        socials.add({'platform': platform, 'url': url});
      }
    }

    return {
      'name': _nameController.text.trim(),
      'email': _emailController.text.trim(),
      'gender': _gender ?? '',
      'phone': _phoneController.text.trim(),
      'birth_date': _birthDate ?? '',
      'birthplace': _birthplaceController.text.trim(),
      'address': _addressController.text.trim(),
      'employment_status': _employmentStatus ?? '',
      'socials': socials,
      'skills': _skills,
    };
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final user = await AuthRepository().updateProfile(_buildPayload());
      ref.read(authControllerProvider.notifier).updateUser(user);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profil berhasil diperbarui')),
      );
      context.pop();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = firstValidationMessage(e));
    } catch (_) {
      if (mounted) setState(() => _error = 'Gagal menyimpan profil. Coba lagi.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profil')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _SectionCard(
                title: 'Akun',
                children: [
                  TextFormField(
                    controller: _nameController,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      labelText: 'Nama Lengkap',
                      prefixIcon: Icon(Icons.person_outline_rounded, size: 20),
                    ),
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'Nama wajib diisi'
                        : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
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
                ],
              ),
              const SizedBox(height: 14),
              _SectionCard(
                title: 'Biodata',
                children: [
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
                    decoration: const InputDecoration(
                      labelText: 'No. HP',
                      prefixIcon: Icon(Icons.phone_outlined, size: 20),
                    ),
                  ),
                  const SizedBox(height: 14),
                  InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: _pickBirthDate,
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Tanggal Lahir',
                        prefixIcon: Icon(Icons.cake_outlined, size: 20),
                      ),
                      child: Text(
                        _birthDate == null
                            ? 'Pilih tanggal'
                            : Formatters.formatDate(Formatters.parseDate(_birthDate)),
                        style: TextStyle(
                          fontSize: 14,
                          color: _birthDate == null
                              ? AppColors.textMuted
                              : AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _birthplaceController,
                    decoration: const InputDecoration(
                      labelText: 'Tempat Lahir',
                      prefixIcon: Icon(Icons.place_outlined, size: 20),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _addressController,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Alamat',
                      alignLabelWithHint: true,
                      prefixIcon: Icon(Icons.home_outlined, size: 20),
                    ),
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String>(
                    initialValue: _employmentStatus,
                    decoration: const InputDecoration(
                      labelText: 'Status Kerja',
                      prefixIcon: Icon(Icons.work_outline_rounded, size: 20),
                    ),
                    items: AppConstants.employmentStatusLabels.entries
                        .map(
                          (e) => DropdownMenuItem(
                            value: e.key,
                            child: Text(e.value),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _employmentStatus = v),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _SectionCard(
                title: 'Keahlian',
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _skillController,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _addSkill(),
                          decoration: const InputDecoration(
                            hintText: 'Contoh: Flutter, Desain, Marketing',
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      FilledButton(
                        onPressed: _addSkill,
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                        ),
                        child: const Text('Tambah'),
                      ),
                    ],
                  ),
                  if (_skills.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final skill in _skills)
                          InputChip(
                            label: Text(skill),
                            onDeleted: () =>
                                setState(() => _skills.remove(skill)),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 14),
              _SectionCard(
                title: 'Media Sosial',
                children: [
                  for (var i = 0; i < _socialPlatformControllers.length; i++) ...[
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 5,
                          child: TextField(
                            controller: _socialPlatformControllers[i],
                            decoration: const InputDecoration(
                              hintText: 'Platform (IG, LinkedIn…)',
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 7,
                          child: TextField(
                            controller: _socialUrlControllers[i],
                            keyboardType: TextInputType.url,
                            decoration: const InputDecoration(hintText: 'URL'),
                          ),
                        ),
                        IconButton(
                          onPressed: () => _removeSocialRow(i),
                          icon: const Icon(Icons.delete_outline_rounded,
                              color: AppColors.danger),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                  ],
                  OutlinedButton.icon(
                    onPressed: _addSocialRow,
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('Tambah Media Sosial'),
                  ),
                ],
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
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.4,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Simpan Perubahan'),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SectionCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}
