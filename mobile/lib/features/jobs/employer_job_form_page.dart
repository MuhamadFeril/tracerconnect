import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/loading_view.dart';
import 'jobs_providers.dart';

/// Halaman formulir untuk membuat atau mengedit lowongan kerja (employer).
class EmployerJobFormPage extends ConsumerStatefulWidget {
  /// ID lowongan yang akan diedit. `null` = buat baru.
  final String? jobId;

  const EmployerJobFormPage({super.key, this.jobId});

  bool get isEditing => jobId != null;

  @override
  ConsumerState<EmployerJobFormPage> createState() =>
      _EmployerJobFormPageState();
}

class _EmployerJobFormPageState extends ConsumerState<EmployerJobFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _companyController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  final _linkController = TextEditingController();

  String _employmentType = '';
  String _status = 'draft';
  bool _loading = false;
  bool _initialLoaded = false;

  @override
  void initState() {
    super.initState();
    if (widget.isEditing) {
      _loadExisting();
    }
  }

  Future<void> _loadExisting() async {
    try {
      final job = await ref
          .read(jobsRepositoryProvider)
          .show(widget.jobId!);
      if (!mounted) return;
      setState(() {
        _titleController.text = job.title;
        _companyController.text = job.companyName;
        _descriptionController.text = job.description ?? '';
        _locationController.text = job.location ?? '';
        _linkController.text = job.applicationLink ?? '';
        _employmentType = job.employmentType ?? '';
        _status = job.status;
        _initialLoaded = true;
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal memuat data lowongan')),
        );
        Navigator.pop(context);
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _companyController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    _linkController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);

    final payload = <String, dynamic>{
      'title': _titleController.text.trim(),
      'company_name': _companyController.text.trim(),
      'description': _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      'location': _locationController.text.trim().isEmpty
          ? null
          : _locationController.text.trim(),
      'employment_type': _employmentType.isEmpty ? null : _employmentType,
      'application_link': _linkController.text.trim().isEmpty
          ? null
          : _linkController.text.trim(),
      'status': _status,
    };

    try {
      final repo = ref.read(jobsRepositoryProvider);
      if (widget.isEditing) {
        await repo.updateJob(widget.jobId!, payload);
      } else {
        await repo.createJob(payload);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.isEditing
                ? 'Lowongan berhasil diperbarui'
                : 'Lowongan berhasil dibuat',
          ),
        ),
      );
      ref.invalidate(jobsProvider);
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal menyimpan: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Show loading while fetching existing data.
    if (widget.isEditing && !_initialLoaded) {
      return Scaffold(
        appBar: AppBar(title: const Text('Edit Lowongan')),
        body: const LoadingView(label: 'Memuat data lowongan…'),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Edit Lowongan' : 'Tambah Lowongan'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            // Info banner for employers.
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.infoBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.info.withValues(alpha: 0.3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline_rounded,
                      color: AppColors.info, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Lowongan Anda akan tersebar ke seluruh sekolah yang terdaftar — pekerjaan maupun magang akan tampil di portal alumni semua sekolah.',
                      style: TextStyle(
                        color: AppColors.info,
                        fontSize: 12,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Posisi.
            _buildTextField(
              controller: _titleController,
              label: 'Posisi *',
              hint: 'Contoh: Software Engineer',
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
            ),
            const SizedBox(height: 14),

            // Perusahaan.
            _buildTextField(
              controller: _companyController,
              label: 'Perusahaan *',
              hint: 'Nama perusahaan',
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
            ),
            const SizedBox(height: 14),

            // Deskripsi.
            _buildTextField(
              controller: _descriptionController,
              label: 'Deskripsi',
              hint: 'Deskripsi posisi, kualifikasi, dan tanggung jawab…',
              maxLines: 4,
            ),
            const SizedBox(height: 14),

            // Tipe pekerjaan.
            _buildDropdown(
              label: 'Tipe Pekerjaan',
              value: _employmentType,
              items: const [
                ('', '— Pilih —'),
                ('full_time', 'Full Time'),
                ('part_time', 'Part Time'),
                ('internship', 'Magang'),
                ('contract', 'Kontrak'),
                ('freelance', 'Freelance'),
              ],
              onChanged: (v) => setState(() => _employmentType = v ?? ''),
            ),
            const SizedBox(height: 14),

            // Lokasi.
            _buildTextField(
              controller: _locationController,
              label: 'Lokasi',
              hint: 'Kota / daerah kerja',
            ),
            const SizedBox(height: 14),

            // Link pendaftaran.
            _buildTextField(
              controller: _linkController,
              label: 'Link Pendaftaran',
              hint: 'https://…',
              keyboardType: TextInputType.url,
            ),
            const SizedBox(height: 14),

            // Status.
            _buildDropdown(
              label: 'Status',
              value: _status,
              items: const [
                ('draft', 'Draft'),
                ('published', 'Published'),
                ('closed', 'Ditutup'),
              ],
              onChanged: (v) => setState(() => _status = v ?? 'draft'),
            ),
            const SizedBox(height: 28),

            // Submit button.
            SizedBox(
              height: 48,
              child: FilledButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(widget.isEditing ? 'Simpan Perubahan' : 'Simpan'),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    String? hint,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        alignLabelWithHint: true,
      ),
    );
  }

  Widget _buildDropdown({
    required String label,
    required String value,
    required List<(String, String)> items,
    required ValueChanged<String?> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      initialValue: value.isEmpty ? null : value,
      decoration: InputDecoration(labelText: label),
      items: items
          .map((e) => DropdownMenuItem(value: e.$1, child: Text(e.$2)))
          .toList(),
      onChanged: onChanged,
    );
  }
}
