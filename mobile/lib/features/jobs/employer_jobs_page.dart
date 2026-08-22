import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/job_vacancy.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'jobs_providers.dart';

/// Halaman manajemen lowongan untuk employer.
///
/// Menampilkan daftar lowongan yang dibuat oleh employer yang sedang login,
/// dengan aksi untuk menambah, mengedit, menghapus, dan melihat pelamar.
class EmployerJobsPage extends ConsumerStatefulWidget {
  const EmployerJobsPage({super.key});

  @override
  ConsumerState<EmployerJobsPage> createState() => _EmployerJobsPageState();
}

class _EmployerJobsPageState extends ConsumerState<EmployerJobsPage> {
  final _searchController = TextEditingController();
  String _search = '';
  String _statusFilter = '';
  int _page = 1;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _applySearch(String value) {
    setState(() {
      _search = value.trim();
      _page = 1;
    });
  }

  @override
  Widget build(BuildContext context) {
    final query = (search: _search, page: _page);
    final jobs = ref.watch(jobsProvider(query));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lowongan Saya'),
        actions: [
          IconButton(
            onPressed: () => context.push('/employer-jobs/new'),
            icon: const Icon(Icons.add_rounded),
            tooltip: 'Tambah Lowongan',
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  textInputAction: TextInputAction.search,
                  onSubmitted: _applySearch,
                  decoration: InputDecoration(
                    hintText: 'Cari posisi atau perusahaan…',
                    prefixIcon: const Icon(Icons.search_rounded, size: 20),
                    isDense: true,
                    suffixIcon: _search.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close_rounded, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              _applySearch('');
                            },
                          )
                        : null,
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 32,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _FilterChip(
                        label: 'Semua',
                        selected: _statusFilter.isEmpty,
                        onTap: () => setState(() {
                          _statusFilter = '';
                          _page = 1;
                        }),
                      ),
                      _FilterChip(
                        label: 'Published',
                        selected: _statusFilter == 'published',
                        onTap: () => setState(() {
                          _statusFilter = 'published';
                          _page = 1;
                        }),
                      ),
                      _FilterChip(
                        label: 'Draft',
                        selected: _statusFilter == 'draft',
                        onTap: () => setState(() {
                          _statusFilter = 'draft';
                          _page = 1;
                        }),
                      ),
                      _FilterChip(
                        label: 'Ditutup',
                        selected: _statusFilter == 'closed',
                        onTap: () => setState(() {
                          _statusFilter = 'closed';
                          _page = 1;
                        }),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/employer-jobs/new'),
        icon: const Icon(Icons.add_rounded, size: 20),
        label: const Text('Tambah'),
      ),
      body: jobs.when(
        loading: () => const LoadingView(label: 'Memuat lowongan…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat lowongan.',
          onRetry: () => ref.invalidate(jobsProvider(query)),
        ),
        data: (page) {
          // Apply client-side status filter since the provider doesn't support it yet.
          var items = page.items;
          if (_statusFilter.isNotEmpty) {
            items = items.where((j) => j.status == _statusFilter).toList();
          }

          if (items.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(jobsProvider(query));
                await ref.read(jobsProvider(query).future);
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  EmptyView(
                    title: 'Belum ada lowongan',
                    description: 'Mulai buat lowongan kerja untuk alumni.',
                    icon: Icons.work_off_outlined,
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(jobsProvider(query));
              await ref.read(jobsProvider(query).future);
            },
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) =>
                  _EmployerJobCard(job: items[index]),
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

class _EmployerJobCard extends StatelessWidget {
  final JobVacancy job;

  const _EmployerJobCard({required this.job});

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
          // Header: title + status.
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.business_center_outlined,
                    color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      job.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      job.companyName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              _StatusBadge(status: job.status),
            ],
          ),
          const SizedBox(height: 12),

          // Meta row.
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              if (job.employmentType != null)
                AppBadge(
                  label: AppConstants.employmentTypeLabel(job.employmentType),
                  tone: BadgeTone.sky,
                ),
              if (job.location != null && job.location!.isNotEmpty)
                AppBadge(
                  label: job.location!,
                  tone: BadgeTone.slate,
                  icon: Icons.place_outlined,
                ),
              if (job.postedAt != null)
                AppBadge(
                  label: Formatters.formatDateFromString(job.postedAt),
                  tone: BadgeTone.slate,
                  icon: Icons.schedule_rounded,
                ),
            ],
          ),
          const SizedBox(height: 12),

          // Action row.
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () =>
                      context.push('/employer-jobs/${job.id}/applicants'),
                  icon: const Icon(Icons.people_outline_rounded, size: 18),
                  label: const Text('Pelamar'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    minimumSize: const Size(0, 40),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () =>
                      context.push('/employer-jobs/${job.id}/edit'),
                  icon: const Icon(Icons.edit_outlined, size: 18),
                  label: const Text('Edit'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textPrimary,
                    minimumSize: const Size(0, 40),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 40,
                height: 40,
                child: OutlinedButton(
                  onPressed: () => _confirmDelete(context),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    side: const BorderSide(color: AppColors.border),
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Icon(Icons.delete_outline_rounded, size: 18),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Lowongan'),
        content: Text(
          'Lowongan "${job.title}" akan dihapus secara permanen.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final repo =
                    ProviderScope.containerOf(context).read(jobsRepositoryProvider);
                await repo.deleteJob(job.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Lowongan berhasil dihapus')),
                  );
                  // Refresh the list.
                  ProviderScope.containerOf(context)
                      .invalidate(jobsProvider);
                }
              } catch (_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Gagal menghapus lowongan. Coba lagi.')),
                  );
                }
              }
            },
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, tone) = switch (status) {
      'published' => ('Published', BadgeTone.green),
      'draft' => ('Draft', BadgeTone.amber),
      'closed' => ('Ditutup', BadgeTone.red),
      _ => (status, BadgeTone.slate),
    };
    return AppBadge(label: label, tone: tone);
  }
}
