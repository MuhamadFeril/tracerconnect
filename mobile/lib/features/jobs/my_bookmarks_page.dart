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

/// Halaman lowongan tersimpan (bookmark).
///
/// Karena backend belum memiliki endpoint khusus bookmark, halaman ini
/// mengambil daftar lowongan dari provider jobs dan menyaring yang
/// `isBookmarked == true`.  Untuk MVP ini cukup; endpoint khusus bisa
/// ditambahkan nanti.
class MyBookmarksPage extends ConsumerStatefulWidget {
  const MyBookmarksPage({super.key});

  @override
  ConsumerState<MyBookmarksPage> createState() => _MyBookmarksPageState();
}

class _MyBookmarksPageState extends ConsumerState<MyBookmarksPage> {
  @override
  Widget build(BuildContext context) {
    final jobs = ref.watch(jobsProvider((search: '', page: 1)));

    return Scaffold(
      appBar: AppBar(title: const Text('Lowongan Tersimpan')),
      body: jobs.when(
        loading: () => const LoadingView(label: 'Memuat lowongan tersimpan…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat lowongan tersimpan.',
          onRetry: () => ref.invalidate(jobsProvider((search: '', page: 1))),
        ),
        data: (page) {
          final bookmarked =
              page.items.where((j) => j.isBookmarked).toList();
          if (bookmarked.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 120),
                EmptyView(
                  title: 'Belum ada lowongan tersimpan',
                  description:
                      'Simpan lowongan yang menarik dengan menekan ikon bookmark di detail lowongan.',
                  icon: Icons.bookmark_border_rounded,
                ),
              ],
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(jobsProvider((search: '', page: 1)));
              await ref.read(jobsProvider((search: '', page: 1)).future);
            },
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: bookmarked.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) =>
                  _BookmarkCard(job: bookmarked[index]),
            ),
          );
        },
      ),
    );
  }
}

class _BookmarkCard extends ConsumerWidget {
  final JobVacancy job;
  const _BookmarkCard({required this.job});

  Future<void> _removeBookmark(BuildContext context, WidgetRef ref) async {
    try {
      await ref
          .read(jobsRepositoryProvider)
          .unbookmark(job.id);
      ref.invalidate(jobsProvider((search: '', page: 1)));
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lowongan dihapus dari tersimpan')),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal menghapus bookmark')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => context.push('/job/${job.id}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
                const SizedBox(width: 4),
                IconButton(
                  onPressed: () => _removeBookmark(context, ref),
                  icon: const Icon(Icons.bookmark_rounded,
                      color: AppColors.primary, size: 22),
                  tooltip: 'Hapus dari tersimpan',
                ),
              ],
            ),
            const SizedBox(height: 10),
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
          ],
        ),
      ),
    );
  }
}
