import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/job_application.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'jobs_providers.dart';

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

class MyApplicationsPage extends ConsumerWidget {
  const MyApplicationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final applications = ref.watch(myApplicationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Lamaran Saya')),
      body: applications.when(
        loading: () => const LoadingView(label: 'Memuat lamaran…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat lamaran.',
          onRetry: () => ref.invalidate(myApplicationsProvider),
        ),
        data: (page) {
          if (page.items.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 120),
                EmptyView(
                  title: 'Belum ada lamaran',
                  description: 'Lamaran yang Anda kirim akan muncul di sini.',
                  icon: Icons.assignment_outlined,
                ),
              ],
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(myApplicationsProvider);
              await ref.read(myApplicationsProvider.future);
            },
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: page.items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) =>
                  _ApplicationCard(application: page.items[index]),
            ),
          );
        },
      ),
    );
  }
}

class _ApplicationCard extends ConsumerWidget {
  final JobApplication application;

  const _ApplicationCard({required this.application});

  Future<void> _withdraw(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Tarik Lamaran'),
        content: const Text('Lamaran ini akan ditarik dan tidak dapat diubah lagi.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Tarik'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    try {
      await ref
          .read(jobsRepositoryProvider)
          .withdraw(application.id);
      if (!context.mounted) return;
      ref.invalidate(myApplicationsProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lamaran berhasil ditarik')),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal menarik lamaran. Coba lagi.')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final canWithdraw = !const ['withdrawn', 'accepted', 'rejected']
        .contains(application.status);

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
                      application.vacancy?.title ?? 'Lowongan',
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      application.vacancy?.companyName ?? '',
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
              AppBadge(
                label: _statusLabels[application.status] ?? application.status,
                tone: _statusTones[application.status] ?? BadgeTone.slate,
              ),
            ],
          ),
          if (application.appliedAt != null) ...[
            const SizedBox(height: 10),
            Text(
              'Dilamar ${Formatters.formatDateFromString(application.appliedAt)}',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
          ],
          if (canWithdraw) ...[
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _withdraw(context, ref),
                icon: const Icon(Icons.undo_rounded, size: 16),
                label: const Text('Tarik Lamaran'),
                style: TextButton.styleFrom(foregroundColor: AppColors.danger),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
