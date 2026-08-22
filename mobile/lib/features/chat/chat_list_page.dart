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
  final _searchController = TextEditingController();
  bool _showSearch = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final conversations = ref.watch(conversationsProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        title: _showSearch
            ? TextField(
                controller: _searchController,
                autofocus: true,
                style: const TextStyle(color: Colors.white, fontSize: 16),
                decoration: const InputDecoration(
                  hintText: 'Cari percakapan…',
                  hintStyle: TextStyle(color: Colors.white54),
                  border: InputBorder.none,
                ),
                onChanged: (_) => setState(() {}),
              )
            : const Text(
                'Chat',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
        actions: [
          IconButton(
            onPressed: () {
              setState(() {
                _showSearch = !_showSearch;
                if (!_showSearch) _searchController.clear();
              });
            },
            icon: Icon(_showSearch ? Icons.close_rounded : Icons.search_rounded),
          ),
          IconButton(
            onPressed: () => context.push('/chat/new'),
            icon: const Icon(Icons.chat_bubble_outline_rounded),
          ),
        ],
      ),
      body: conversations.when(
        loading: () => const LoadingView(label: 'Memuat percakapan…'),
        error: (e, _) => ErrorView(
          message: e.toString().replaceAll('Exception: ', ''),
          onRetry: () => ref.invalidate(conversationsProvider),
        ),
        data: (items) {
          final query = _searchController.text.trim().toLowerCase();
          final filtered = query.isEmpty
              ? items
              : items
                  .where((c) =>
                      c.title.toLowerCase().contains(query) ||
                      (c.lastMessage?.body ?? '')
                          .toLowerCase()
                          .contains(query))
                  .toList();

          if (filtered.isEmpty) {
            return const EmptyView(
              title: 'Belum ada percakapan',
              description: 'Mulai chat dengan koneksi Anda lewat tombol +.',
              icon: Icons.chat_bubble_outline_rounded,
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(conversationsProvider);
              await ref.read(conversationsProvider.future);
            },
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const Divider(
                height: 1,
                indent: 76,
                color: Color(0xFFF0F0F0),
              ),
              itemBuilder: (context, index) {
                final conversation = filtered[index];
                return _ConversationTile(
                  conversation: conversation,
                  onTap: () => context.push('/chat/${conversation.id}'),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/chat/new'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        child: const Icon(Icons.chat_rounded, size: 24),
      ),
    );
  }
}

// ─── Conversation Tile (WhatsApp-style) ─────────────────────────────────────

class _ConversationTile extends StatelessWidget {
  final ChatConversation conversation;
  final VoidCallback onTap;

  const _ConversationTile({
    required this.conversation,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final lastMsg = conversation.lastMessage;
    final hasUnread = conversation.unreadCount > 0;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            // Avatar with online dot
            Stack(
              children: [
                AppAvatar(
                  imageUrl: conversation.otherAvatarUrl,
                  name: conversation.otherName,
                  size: 52,
                ),
                Positioned(
                  right: 0,
                  bottom: 0,                    child: Container(
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      color: AppColors.success,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 14),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name + time
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          conversation.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight:
                                hasUnread ? FontWeight.w700 : FontWeight.w500,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _timeLabel(
                            conversation.lastMessage?.createdAt ??
                                conversation.lastMessageAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: hasUnread
                              ? AppColors.primary
                              : AppColors.textMuted,
                          fontWeight:
                              hasUnread ? FontWeight.w700 : FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),

                  // Last message + unread badge
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _lastMessageLabel(lastMsg),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13.5,
                            color: hasUnread
                                ? AppColors.textPrimary
                                : AppColors.textMuted,
                            fontWeight:
                                hasUnread ? FontWeight.w600 : FontWeight.w400,
                          ),
                        ),
                      ),
                      if (hasUnread) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            conversation.unreadCount > 99
                                ? '99+'
                                : '${conversation.unreadCount}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                      if (conversation.muted && !hasUnread) ...[
                        const SizedBox(width: 6),
                        const Icon(Icons.volume_off_rounded,
                            size: 16, color: AppColors.textMuted),
                      ],
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

  String _lastMessageLabel(ChatMessage? message) {
    if (message == null) return 'Belum ada pesan';
    if (message.isDeleted) return '🚫 Pesan dihapus';
    if (message.type == 'image') return '📷 Foto';
    if (message.type == 'file') return '📎 ${message.attachment?.name ?? 'File'}';
    final body = message.body ?? '';
    if (body.isEmpty) return 'Pesan kosong';
    // Show sender prefix for group chats
    return body;
  }

  String _timeLabel(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr);
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final target = DateTime(dt.year, dt.month, dt.day);
      final diff = today.difference(target).inDays;

      final time =
          '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      if (diff == 0) return time;
      if (diff == 1) return 'Kemarin';
      if (diff < 7) {
        const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        return days[dt.weekday % 7];
      }
      return '${dt.day}/${dt.month}';
    } catch (_) {
      return '';
    }
  }
}
