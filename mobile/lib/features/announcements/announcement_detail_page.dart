import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'announcements_providers.dart';

class AnnouncementDetailPage extends ConsumerWidget {
  final String id;

  const AnnouncementDetailPage({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final announcement = ref.watch(announcementDetailProvider(id));

    return Scaffold(
      appBar: AppBar(title: const Text('Pengumuman')),
      body: announcement.when(
        loading: () => const LoadingView(label: 'Memuat pengumuman…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat pengumuman.',
          onRetry: () => ref.invalidate(announcementDetailProvider(id)),
        ),
        data: (a) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppColors.violetBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.campaign_outlined,
                            color: AppColors.violet, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          a.title,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Divider(),
                  const SizedBox(height: 10),
                  Text(
                    'Diterbitkan ${Formatters.formatDateFromString(a.publishedAt ?? a.createdAt)}',
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    a.body,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                      height: 1.65,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
