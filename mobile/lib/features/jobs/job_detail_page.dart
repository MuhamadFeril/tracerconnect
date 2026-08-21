import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/job_vacancy.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../chat/chat_providers.dart';
import 'jobs_providers.dart';

class JobDetailPage extends ConsumerWidget {
  final String id;

  const JobDetailPage({super.key, required this.id});

  Future<void> _askRecruiter(BuildContext context, WidgetRef ref, String jobId) async {
    try {
      final conversation =
          await ref.read(chatRepositoryProvider).start(jobVacancyId: jobId);
      if (!context.mounted) return;
      ref.invalidate(conversationsProvider);
      context.push('/chat/${conversation.id}');
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal memulai percakapan dengan rekruter')),
      );
    }
  }

  Future<void> _openLink(BuildContext context, String? link) async {
    if (link == null || link.isEmpty) return;
    final uri = Uri.tryParse(link);
    if (uri == null || !uri.hasScheme) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Link lamaran tidak valid.')),
      );
      return;
    }
    // Only allow HTTP/HTTPS schemes to prevent intent://, javascript:, file:// abuse.
    if (uri.scheme != 'http' && uri.scheme != 'https') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Link lamaran tidak valid.')),
      );
      return;
    }
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal membuka link lamaran.')),
      );
    }
  }

  Future<void> _apply(
      BuildContext context, WidgetRef ref, String jobId) async {
    final controller = TextEditingController();
    final applied = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Kirim Lamaran'),
        content: TextField(
          controller: controller,
          maxLines: 4,
          maxLength: 5000,
          decoration: const InputDecoration(
            hintText: 'Ceritakan singkat mengapa Anda cocok… (opsional)',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Kirim'),
          ),
        ],
      ),
    );
    if (applied != true || !context.mounted) return;

    try {
      await ref.read(applyJobProvider((jobId: jobId, coverLetter: controller.text)).future);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lamaran berhasil dikirim')),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengirim lamaran. Coba lagi.')),
      );
    }
  }

  Future<void> _toggleBookmark(BuildContext context, WidgetRef ref, JobVacancy j) async {
    try {
      final repo = ref.read(jobsRepositoryProvider);
      if (j.isBookmarked) {
        await repo.unbookmark(j.id);
      } else {
        await repo.bookmark(j.id);
      }
      if (!context.mounted) return;
      ref.invalidate(jobDetailProvider(id));
      ref.invalidate(jobsProvider((search: '', page: 1)));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            j.isBookmarked
                ? 'Lowongan dihapus dari tersimpan'
                : 'Lowongan disimpan ke bookmark',
          ),
        ),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengubah bookmark')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final job = ref.watch(jobDetailProvider(id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detail Lowongan'),
        actions: [
          job.maybeWhen(
            data: (j) => IconButton(
              onPressed: () => _toggleBookmark(context, ref, j),
              icon: Icon(
                j.isBookmarked
                    ? Icons.bookmark_rounded
                    : Icons.bookmark_border_rounded,
                color: j.isBookmarked ? AppColors.primary : AppColors.textMuted,
              ),
              tooltip: j.isBookmarked ? 'Hapus dari tersimpan' : 'Simpan lowongan',
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: job.when(
        loading: () => const LoadingView(label: 'Memuat lowongan…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat detail lowongan.',
          onRetry: () => ref.invalidate(jobDetailProvider(id)),
        ),
        data: (j) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.business_center_outlined,
                        color: Colors.white, size: 26),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          j.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          j.companyName,
                          style: const TextStyle(
                              color: Color(0xFFCBD5F5), fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                if (j.employmentType != null)
                  AppBadge(
                    label: AppConstants.employmentTypeLabel(j.employmentType),
                    tone: BadgeTone.sky,
                  ),
                if (j.location != null && j.location!.isNotEmpty)
                  AppBadge(
                    label: j.location!,
                    tone: BadgeTone.slate,
                    icon: Icons.place_outlined,
                  ),
                if (j.postedAt != null)
                  AppBadge(
                    label: 'Diposting ${Formatters.formatDateFromString(j.postedAt)}',
                    tone: BadgeTone.slate,
                    icon: Icons.schedule_rounded,
                  ),
              ],
            ),
            const SizedBox(height: 18),
            const Text(
              'Deskripsi',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              (j.description == null || j.description!.isEmpty)
                  ? 'Tidak ada deskripsi untuk lowongan ini.'
                  : j.description!,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 24),
            if (j.createdBy != null && j.createdBy!.isNotEmpty)
              OutlinedButton.icon(
                onPressed: () => _askRecruiter(context, ref, j.id),
                icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                label: const Text('Tanya Rekruter'),
              ),
            if (j.createdBy != null &&
                j.createdBy!.isNotEmpty &&
                j.applicationLink != null &&
                j.applicationLink!.isNotEmpty)
              const SizedBox(height: 10),
            if (j.applicationLink != null && j.applicationLink!.isNotEmpty)
              FilledButton.icon(
                onPressed: () => _openLink(context, j.applicationLink),
                icon: const Icon(Icons.open_in_new_rounded, size: 18),
                label: const Text('Lamar via Link'),
              ),
            if (j.applicationLink != null &&
                j.applicationLink!.isNotEmpty)
              const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: () => _apply(context, ref, j.id),
              icon: const Icon(Icons.send_rounded, size: 18),
              label: const Text('Lamar Lewat Aplikasi'),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () => context.push('/my-applications'),
              icon: const Icon(Icons.assignment_outlined, size: 18),
              label: const Text('Lamaran Saya'),
            ),
          ],
        ),
      ),
    );
  }
}
