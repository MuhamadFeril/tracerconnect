import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/chat.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'chat_providers.dart';

class ChatListPage extends ConsumerStatefulWidget {
  const ChatListPage({super.key});

  @override
  ConsumerState<ChatListPage> createState() => _ChatListPageState();
}

class _ChatListPageState extends ConsumerState<ChatListPage> {
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    // REST polling transport (shared-hosting friendly).
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) ref.invalidate(conversationsProvider);
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final conversations = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Pesan')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.primary,
        onPressed: () => context.push('/chat/new'),
        tooltip: 'Percakapan baru',
        child: const Icon(Icons.add_comment_rounded),
      ),
      body: conversations.when(
        loading: () => const LoadingView(label: 'Memuat percakapan…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat percakapan.',
          onRetry: () => ref.invalidate(conversationsProvider),
        ),
        data: (items) {
          if (items.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(conversationsProvider);
                await ref.read(conversationsProvider.future);
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  EmptyView(
                    title: 'Belum ada percakapan',
                    description: 'Mulai chat dengan koneksi Anda lewat tombol +.',
                    icon: Icons.chat_bubble_outline_rounded,
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(conversationsProvider);
              await ref.read(conversationsProvider.future);
            },
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) => _ConversationCard(
                conversation: items[index],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ConversationCard extends ConsumerWidget {
  final ChatConversation conversation;

  const _ConversationCard({required this.conversation});

  String _preview() {
    final message = conversation.lastMessage;
    if (message == null) return 'Belum ada pesan';
    if (message.isDeleted) return 'Pesan dihapus';
    if (message.type == 'image') return '📷 Foto';
    if (message.type == 'file') return '📎 ${message.attachment?.name ?? 'File'}';
    return message.body ?? '';
  }

  String _timeLabel(String? value) {
    if (value == null || value.isEmpty) return '';
    final date = DateTime.tryParse(value);
    if (date == null) return '';
    final now = DateTime.now();
    final local = date.toLocal();
    if (local.year == now.year && local.month == now.month && local.day == now.day) {
      return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return '${local.day} ${months[local.month - 1]}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => context.push('/chat/${conversation.id}'),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: conversation.unreadCount > 0 ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Row(
          children: [
            AppAvatar(
              imageUrl: conversation.otherAvatarUrl,
              name: conversation.otherName,
              size: 48,
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
                          conversation.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _timeLabel(conversation.lastMessage?.createdAt ??
                            conversation.lastMessageAt),
                        style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _preview(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: conversation.unreadCount > 0
                                ? AppColors.textSecondary
                                : AppColors.textMuted,
                            fontSize: 12.5,
                            fontWeight: conversation.unreadCount > 0
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (conversation.muted)
                        const Padding(
                          padding: EdgeInsets.only(right: 4),
                          child: Icon(Icons.notifications_off_rounded,
                              size: 15, color: AppColors.textMuted),
                        ),
                      if (conversation.unreadCount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            conversation.unreadCount > 99
                                ? '99+'
                                : '${conversation.unreadCount}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
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
