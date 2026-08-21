import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/notification_item.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'notifications_providers.dart';

class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);
    final unread = ref.watch(unreadCountProvider);
    final items = notifications.valueOrNull?.items ?? const [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifikasi'),
        actions: [
          if ((unread.valueOrNull ?? 0) > 0)
            TextButton(
              onPressed: () async {
                await ref.read(notificationsRepositoryProvider).markAllRead();
                ref.invalidate(unreadCountProvider);
                ref.invalidate(notificationsProvider);
              },
              child: const Text('Tandai semua dibaca'),
            ),
        ],
      ),
      body: notifications.when(
        loading: () => const LoadingView(label: 'Memuat notifikasi…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat notifikasi.',
          onRetry: () {
            ref.invalidate(notificationsProvider);
            ref.invalidate(unreadCountProvider);
          },
        ),
        data: (_) {
          if (items.isEmpty) {
            return const EmptyView(
              title: 'Belum ada notifikasi',
              description:
                  'Notifikasi pengumuman, acara, dan lowongan baru akan muncul di sini.',
              icon: Icons.notifications_none_rounded,
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(notificationsProvider);
              ref.invalidate(unreadCountProvider);
              await ref.read(notificationsProvider.future);
            },
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) => _NotificationTile(item: items[index]),
            ),
          );
        },
      ),
    );
  }
}

class _NotificationTile extends ConsumerWidget {
  final NotificationItem item;

  const _NotificationTile({required this.item});

  Future<void> _open(BuildContext context, WidgetRef ref) async {
    if (!item.isRead) {
      try {
        await ref.read(notificationsRepositoryProvider).markRead(item.id);
        ref.invalidate(notificationsProvider);
        ref.invalidate(unreadCountProvider);
      } catch (_) {
        // Tetap buka detail meskipun gagal menandai.
      }
    }
    if (!context.mounted) return;
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.title,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                AppBadge(
                  label: item.kind,
                  tone: item.kind == 'connection' ? BadgeTone.violet : BadgeTone.navy,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              Formatters.formatDateTimeFromString(item.createdAt),
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 14),
            Text(
              item.body,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
                height: 1.55,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = !item.isRead;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => _open(context, ref),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: unread ? const Color(0xFFF8FAFF) : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: unread ? AppColors.primaryLight : AppColors.border,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: unread ? AppColors.primaryLight : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(11),
              ),
              child: Icon(
                _iconForKind(item.kind),
                color: unread ? AppColors.primary : AppColors.textMuted,
                size: 21,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 14,
                            fontWeight:
                                unread ? FontWeight.w700 : FontWeight.w600,
                          ),
                        ),
                      ),
                      if (unread)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),
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
                  const SizedBox(height: 5),
                  Text(
                    Formatters.formatDateTimeFromString(item.createdAt),
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _iconForKind(String kind) {
    switch (kind) {
      case 'announcement':
        return Icons.campaign_outlined;
      case 'event':
        return Icons.event_outlined;
      case 'job':
        return Icons.work_outline_rounded;
      case 'connection':
        return Icons.people_outline_rounded;
      default:
        return Icons.notifications_none_rounded;
    }
  }
}
