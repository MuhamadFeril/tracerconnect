import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'announcements_providers.dart';

class AnnouncementsPage extends ConsumerWidget {
  const AnnouncementsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final announcements = ref.watch(announcementsProvider(1));

    return Scaffold(
      appBar: AppBar(title: const Text('Pengumuman')),
      body: announcements.when(
        loading: () => const LoadingView(label: 'Memuat pengumuman…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat pengumuman.',
          onRetry: () => ref.invalidate(announcementsProvider(1)),
        ),
        data: (page) {
          if (page.items.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 120),
                EmptyView(
                  title: 'Belum ada pengumuman',
                  description: 'Pengumuman dari institusi Anda akan muncul di sini.',
                  icon: Icons.campaign_outlined,
                ),
              ],
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: page.items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = page.items[index];
              return InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => context.push('/announcement/${item.id}'),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: AppColors.violetBg,
                          borderRadius: BorderRadius.circular(11),
                        ),
                        child: const Icon(Icons.campaign_outlined,
                            color: AppColors.violet, size: 21),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 14.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              item.body,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 13,
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              Formatters.formatDateFromString(
                                  item.publishedAt ?? item.createdAt),
                              style: const TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 11.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded,
                          color: AppColors.textMuted, size: 20),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
