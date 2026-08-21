import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../networking/networking_providers.dart';
import 'chat_providers.dart';

class NewConversationPage extends ConsumerWidget {
  const NewConversationPage({super.key});

  Future<void> _start(BuildContext context, WidgetRef ref, String userId) async {
    try {
      final conversation =
          await ref.read(chatRepositoryProvider).start(userId: userId);
      if (!context.mounted) return;
      ref.invalidate(conversationsProvider);
      context.pushReplacement('/chat/${conversation.id}');
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal memulai percakapan')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connections = ref.watch(connectionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Percakapan Baru')),
      body: connections.when(
        loading: () => const LoadingView(label: 'Memuat koneksi…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat koneksi.',
          onRetry: () => ref.invalidate(connectionsProvider),
        ),
        data: (items) {
          if (items.isEmpty) {
            return const EmptyView(
              title: 'Belum ada koneksi',
              description:
                  'Hubungkan dahulu dengan alumni lain di menu Jejaring sebelum chat.',
              icon: Icons.person_add_alt_1_outlined,
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final item = items[index];
              final userId = item.userId;
              return InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: userId == null ? null : () => _start(context, ref, userId),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      AppAvatar(
                        imageUrl: item.userAvatarUrl,
                        name: item.userName,
                        size: 46,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.userName ?? 'Alumni',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 14.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              [
                                item.department ?? '',
                                item.graduationYear != null
                                    ? '${item.graduationYear}'
                                    : '',
                                item.companyName ?? '',
                              ].where((e) => e.isNotEmpty).join(' · '),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  color: AppColors.textMuted, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chat_bubble_outline_rounded,
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
