import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'jobs_providers.dart';
import 'jobs_repository.dart';

const _statusLabels = {
  'submitted': 'Diajukan',
  'reviewing': 'Sedang Ditinjau',
  'shortlisted': 'Daftar Pendek',
  'interview': 'Interview',
  'accepted': 'Diterima',
  'rejected': 'Ditolak',
  'withdrawn': 'Ditarik',
};

const _statusTones = {
  'submitted': BadgeTone.sky,
  'reviewing': BadgeTone.amber,
  'shortlisted': BadgeTone.violet,
  'interview': BadgeTone.navy,
  'accepted': BadgeTone.green,
  'rejected': BadgeTone.red,
  'withdrawn': BadgeTone.slate,
};

/// Status yang bisa dipilih hrd.
const _editableStatuses = [
  'reviewing',
  'shortlisted',
  'interview',
  'accepted',
  'rejected',
];

/// Halaman daftar pelamar untuk lowongan tertentu (hrd view).
class HrdApplicantsPage extends ConsumerStatefulWidget {
  final String jobId;
  final String? jobTitle;

  const HrdApplicantsPage({
    super.key,
    required this.jobId,
    this.jobTitle,
  });

  @override
  ConsumerState<HrdApplicantsPage> createState() =>
      _HrdApplicantsPageState();
}

class _HrdApplicantsPageState
    extends ConsumerState<HrdApplicantsPage> {
  String _statusFilter = '';

  @override
  Widget build(BuildContext context) {
    final query = (jobId: widget.jobId, status: _statusFilter);
    final applicants = ref.watch(applicantsProvider(query));

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.jobTitle ?? 'Pelamar'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _FilterChip(
                  label: 'Semua',
                  selected: _statusFilter.isEmpty,
                  onTap: () => setState(() => _statusFilter = ''),
                ),
                for (final status in _editableStatuses)
                  _FilterChip(
                    label: _statusLabels[status] ?? status,
                    selected: _statusFilter == status,
                    onTap: () => setState(() => _statusFilter = status),
                  ),
              ],
            ),
          ),
        ),
      ),
      body: applicants.when(
        loading: () => const LoadingView(label: 'Memuat pelamar…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat data pelamar.',
          onRetry: () => ref.invalidate(applicantsProvider(query)),
        ),
        data: (page) {
          if (page.items.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(applicantsProvider(query));
                await ref.read(applicantsProvider(query).future);
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  EmptyView(
                    title: 'Belum ada pelamar',
                    description:
                        'Pelamar yang mengirim lamaran akan muncul di sini.',
                    icon: Icons.people_outline_rounded,
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(applicantsProvider(query));
              await ref.read(applicantsProvider(query).future);
            },
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: page.items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) =>
                  _ApplicantCard(applicant: page.items[index]),
            ),
          );
        },
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : AppColors.surface,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.border,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : AppColors.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _ApplicantCard extends ConsumerWidget {
  final JobApplicant applicant;

  const _ApplicantCard({required this.applicant});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = applicant.alumniName ?? 'Alumni';
    final initials = name.split(' ').take(2).map((w) => w[0]).join().toUpperCase();

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
          // Header: avatar + name + status.
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.primaryLight,
                child: Text(
                  initials,
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [
                        if (applicant.alumniDepartment != null)
                          applicant.alumniDepartment!,
                        if (applicant.alumniGraduationYear != null)
                          "'${applicant.alumniGraduationYear.toString().substring(2)}",
                      ].join(' · '),
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              AppBadge(
                label: _statusLabels[applicant.status] ?? applicant.status,
                tone: _statusTones[applicant.status] ?? BadgeTone.slate,
              ),
            ],
          ),

          // Cover letter.
          if (applicant.coverLetter != null &&
              applicant.coverLetter!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                applicant.coverLetter!,
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ),
          ],

          // Detail CV button
          if (applicant.cvData != null) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _showCvDetail(context),
                icon: const Icon(Icons.description_outlined, size: 16),
                label: const Text('Detail CV'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
          ],

          // Status update buttons.
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final status in _editableStatuses)
                if (status != applicant.status)
                  ActionChip(
                    label: Text(
                      _statusLabels[status] ?? status,
                      style: const TextStyle(fontSize: 11),
                    ),
                    backgroundColor:
                        (_statusTones[status] == BadgeTone.green
                                ? AppColors.successBg
                                : _statusTones[status] == BadgeTone.red
                                    ? AppColors.dangerBg
                                    : AppColors.surface)
                            .withValues(alpha: 0.8),
                    side: BorderSide(
                      color: AppColors.border,
                    ),
                    onPressed: () =>
                        _updateStatus(context, ref, status),
                    padding: EdgeInsets.zero,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _updateStatus(
      BuildContext context, WidgetRef ref, String newStatus) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ubah Status'),
        content: Text(
          'Ubah status lamaran ${applicant.alumniName ?? "alumni"} menjadi "${_statusLabels[newStatus]}"?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Ubah'),
          ),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) return;

    try {
      await ref
          .read(jobsRepositoryProvider)
          .updateApplicationStatus(applicant.id, newStatus);
      if (!context.mounted) return;

      // Refresh applicants list.
      ref.invalidate(applicantsProvider);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Status berhasil diubah menjadi "${_statusLabels[newStatus]}"',
          ),
        ),
      );
    } catch (_) {
      if (!context.mounted) return;      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal mengubah status. Coba lagi.')),
        );
    }
  }

  void _showCvDetail(BuildContext context) {
    final cv = applicant.cvData;
    if (cv == null) return;

    final skills = (cv['skills'] as List?)?.cast<String>() ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        expand: false,
        builder: (ctx, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Header
              Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: AppColors.primaryLight,
                    child: Text(
                      (cv['full_name'] ?? applicant.alumniName ?? '?')[0].toString().toUpperCase(),
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          cv['full_name'] ?? applicant.alumniName ?? '-',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        if (cv['email'] != null)
                          Text(
                            cv['email'],
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Info items
              _CvInfoRow(icon: Icons.person_outline, label: 'Jenis Kelamin', value: cv['gender'] == 'male' ? 'Laki-laki' : cv['gender'] == 'female' ? 'Perempuan' : null),
              _CvInfoRow(icon: Icons.phone_outlined, label: 'No. HP', value: cv['phone'] as String?),
              _CvInfoRow(icon: Icons.location_on_outlined, label: 'Tempat Lahir', value: cv['birthplace'] as String?),
              _CvInfoRow(icon: Icons.calendar_today_outlined, label: 'Tanggal Lahir', value: cv['birth_date'] as String?),
              _CvInfoRow(icon: Icons.school_outlined, label: 'Jurusan', value: cv['department'] as String?),
              _CvInfoRow(icon: Icons.school_outlined, label: 'Tahun Lulus', value: cv['graduation_year'] as String?),
              _CvInfoRow(icon: Icons.school_outlined, label: 'Pendidikan', value: cv['education'] as String?),
              _CvInfoRow(icon: Icons.home_outlined, label: 'Alamat', value: cv['address'] as String?),
              _CvInfoRow(icon: Icons.work_outline, label: 'Pengalaman', value: cv['experience'] as String?),
              _CvInfoRow(icon: Icons.favorite_outline, label: 'Minat', value: cv['interests'] as String?),

              // Skills
              if (skills.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Keahlian',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: skills.map((s) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      s,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  )).toList(),
                ),
              ],

              // Cover letter
              if (applicant.coverLetter != null && applicant.coverLetter!.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Surat Lamaran',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  applicant.coverLetter!,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ─── CV Info Row ────────────────────────────────────────────────────────────

class _CvInfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? value;

  const _CvInfoRow({required this.icon, required this.label, this.value});

  @override
  Widget build(BuildContext context) {
    if (value == null || value!.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.textMuted),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value!,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

