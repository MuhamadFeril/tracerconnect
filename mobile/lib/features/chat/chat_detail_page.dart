import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../models/chat.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'chat_providers.dart';

class ChatDetailPage extends ConsumerStatefulWidget {
  final String conversationId;

  const ChatDetailPage({super.key, required this.conversationId});

  @override
  ConsumerState<ChatDetailPage> createState() => _ChatDetailPageState();
}

class _ChatDetailPageState extends ConsumerState<ChatDetailPage> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  Timer? _pollTimer;

  File? _pendingImage;
  List<ChatMessage> _older = [];
  int _olderPage = 1;
  bool _loadingOlder = false;
  bool _sending = false;

  String get _conversationId => widget.conversationId;

  @override
  void initState() {
    super.initState();
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) {
        ref.invalidate(
          conversationMessagesProvider(
            (conversationId: _conversationId, page: 1),
          ),
        );
        ref.invalidate(conversationProvider(_conversationId));
      }
    });
    // Tandai sudah dibaca saat membuka percakapan.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(chatRepositoryProvider).markRead(_conversationId);
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _loadOlder() async {
    if (_loadingOlder) return;
    final next = _olderPage + 1;
    final repo = ref.read(chatRepositoryProvider);
    _loadingOlder = true;
    try {
      final page = await repo.messages(_conversationId, page: next);
      if (!mounted) return;
      setState(() {
        _older = [...page.items.reversed, ..._older];
        _olderPage = next;
      });
    } catch (_) {
      // Gagal memuat pesan lama — biarkan apa adanya.
    } finally {
      _loadingOlder = false;
    }
  }

  Future<void> _send() async {
    final body = _messageController.text.trim();
    if ((body.isEmpty && _pendingImage == null) || _sending) return;

    setState(() => _sending = true);
    try {
      final repo = ref.read(chatRepositoryProvider);
      if (_pendingImage != null) {
        await repo.sendMessage(
          _conversationId,
          type: 'image',
          body: body.isEmpty ? null : body,
          attachment: _pendingImage,
        );
      } else {
        await repo.sendMessage(_conversationId, type: 'text', body: body);
      }
      if (!mounted) return;
      setState(() {
        _messageController.clear();
        _pendingImage = null;
        _older = [];
        _olderPage = 1;
      });
      ref.invalidate(conversationMessagesProvider(
        (conversationId: _conversationId, page: 1),
      ));
      ref.invalidate(conversationProvider(_conversationId));
      ref.invalidate(conversationsProvider);
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengirim pesan')),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      imageQuality: 85,
    );
    if (file == null) return;
    if (!mounted) return;
    setState(() => _pendingImage = File(file.path));
  }

  Future<void> _deleteMessage(ChatMessage message) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus Pesan?'),
        content: const Text('Pesan hanya akan dihapus untuk Anda.', style: TextStyle(fontSize: 14)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await ref.read(chatRepositoryProvider).deleteMessage(message.id);
      ref.invalidate(conversationMessagesProvider(
        (conversationId: _conversationId, page: 1),
      ));
      ref.invalidate(conversationsProvider);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal menghapus pesan')),
      );
    }
  }

  Future<void> _toggleMute(ChatConversation conversation) async {
    try {
      await ref.read(chatRepositoryProvider).setMuted(
        _conversationId,
        !conversation.muted,
      );
      ref.invalidate(conversationProvider(_conversationId));
      ref.invalidate(conversationsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(conversation.muted ? 'Notifikasi diaktifkan' : 'Percakapan dibisukan')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengubah notifikasi')),
      );
    }
  }

  Future<void> _report() async {
    final controller = TextEditingController();
    String reason = 'spam';

    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Laporkan Percakapan'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DropdownButtonFormField<String>(
                value: reason,
                decoration: const InputDecoration(labelText: 'Alasan'),
                items: const [
                  DropdownMenuItem(value: 'spam', child: Text('Spam / Promosi')),
                  DropdownMenuItem(
                      value: 'abusive', child: Text('Pelecehan / Konten tidak pantas')),
                  DropdownMenuItem(value: 'scam', child: Text('Penipuan')),
                  DropdownMenuItem(value: 'other', child: Text('Lainnya')),
                ],
                onChanged: (v) => setDialogState(() => reason = v ?? 'spam'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Detail (opsional)',
                  alignLabelWithHint: true,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Batal'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop({
                'reason': reason,
                'description': controller.text,
              }),
              child: const Text('Kirim Laporan'),
            ),
          ],
        ),
      ),
    );
    controller.dispose();

    if (result == null || !mounted) return;
    try {
      await ref.read(chatRepositoryProvider).report(
        _conversationId,
        reason: result['reason'] ?? 'spam',
        description: result['description'],
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Laporan berhasil dikirim')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengirim laporan')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final conversation = ref.watch(conversationProvider(_conversationId));
    final page1 = ref.watch(conversationMessagesProvider(
      (conversationId: _conversationId, page: 1),
    ));

    return Scaffold(
      appBar: AppBar(
        title: conversation.maybeWhen(
          data: (c) => Row(
            children: [
              AppAvatar(
                imageUrl: c.otherAvatarUrl,
                name: c.otherName,
                size: 34,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      c.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    if (c.job != null)
                      Text(
                        '${c.job!.title} · ${c.job!.companyName ?? ''}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                  ],
                ),
              ),
            ],
          ),
          orElse: () => const Text('Percakapan'),
        ),
        actions: [
          conversation.maybeWhen(
            data: (c) => PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'mute':
                    _toggleMute(c);
                    break;
                  case 'report':
                    _report();
                    break;
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'mute',
                  child: Row(
                    children: [
                      Icon(
                        c.muted
                            ? Icons.notifications_rounded
                            : Icons.notifications_off_rounded,
                        size: 18,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 8),
                      Text(c.muted ? 'Nyalakan notifikasi' : 'Bisukan'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'report',
                  child: Row(
                    children: [
                      Icon(Icons.flag_outlined, color: AppColors.danger, size: 18),
                      SizedBox(width: 8),
                      Text('Laporkan'),
                    ],
                  ),
                ),
              ],
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: page1.when(
              loading: () => const LoadingView(label: 'Memuat pesan…'),
              error: (e, _) => const Center(
                child: Text(
                  'Gagal memuat pesan.',
                  style: TextStyle(color: AppColors.textMuted),
                ),
              ),
              data: (page) {
                final newest = page.items.reversed.toList();
                final messages = [..._older, ...newest];

                if (messages.isEmpty) {
                  return const EmptyView(
                    title: 'Belum ada pesan',
                    description: 'Kirim sapaan pertama Anda.',
                    icon: Icons.chat_bubble_outline_rounded,
                  );
                }

                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: messages.length + 1,
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      if (!page.hasMore && _olderPage == 1) {
                        return const SizedBox.shrink();
                      }
                      return Center(
                        child: TextButton(
                          onPressed: _loadOlder,
                          child: const Text('Muat pesan lama'),
                        ),
                      );
                    }
                    final message = messages[index - 1];
                    return _MessageBubble(
                      message: message,
                      onDelete: message.isMine ? () => _deleteMessage(message) : null,
                    );
                  },
                );
              },
            ),
          ),
          if (_pendingImage != null)
            Container(
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(
                      _pendingImage!,
                      width: 40,
                      height: 40,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Foto siap dikirim',
                      style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                    ),
                  ),
                  IconButton(
                    onPressed: () => setState(() => _pendingImage = null),
                    icon: const Icon(Icons.close_rounded, size: 18),
                    color: AppColors.textMuted,
                  ),
                ],
              ),
            ),
          _composer(),
        ],
      ),
    );
  }

  Widget _composer() {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            IconButton(
              onPressed: _pickImage,
              icon: const Icon(Icons.photo_library_outlined, color: AppColors.textSecondary),
              tooltip: 'Kirim foto',
            ),
            Expanded(
              child: TextField(
                controller: _messageController,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: InputDecoration(
                  hintText: 'Tulis pesan…',
                  isDense: true,
                  filled: true,
                  fillColor: AppColors.background,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
            IconButton.filled(
              onPressed: _sending ? null : _send,
              icon: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.send_rounded, size: 20),
              style: IconButton.styleFrom(backgroundColor: AppColors.primary),
              tooltip: 'Kirim',
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final VoidCallback? onDelete;

  const _MessageBubble({required this.message, this.onDelete});

  @override
  Widget build(BuildContext context) {
    final mine = message.isMine;
    final bubbleColor = mine ? AppColors.primary : AppColors.surface;
    final textColor = mine ? Colors.white : AppColors.textPrimary;

    final content = message.isDeleted
        ? const Text('Pesan dihapus',
            style: TextStyle(color: AppColors.textMuted, fontStyle: FontStyle.italic))
        : _content(context, textColor);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (mine && onDelete != null)
            InkWell(
              onTap: onDelete,
              borderRadius: BorderRadius.circular(8),
              child: const Padding(
                padding: EdgeInsets.all(6),
                child: Icon(Icons.delete_outline_rounded,
                    size: 16, color: AppColors.textMuted),
              ),
            ),
          Flexible(
            child: Container(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.74),
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
              decoration: BoxDecoration(
                color: bubbleColor,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(mine ? 16 : 4),
                  bottomRight: Radius.circular(mine ? 4 : 16),
                ),
                border: mine ? null : Border.all(color: AppColors.border),
              ),
              child: content,
            ),
          ),
        ],
      ),
    );
  }

  Widget _content(BuildContext context, Color textColor) {
    if (message.type == 'image' && message.attachment?.url != null) {
      final url = AppConstants.resolveAssetUrl(message.attachment!.url);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: () => showDialog(
              context: context,
              builder: (context) => Dialog(
                child: InteractiveViewer(
                  child: Image.network(url),
                ),
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.network(
                url,
                width: 220,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox(
                  width: 220,
                  height: 120,
                  child: Icon(Icons.broken_image_outlined, color: AppColors.textMuted),
                ),
              ),
            ),
          ),
          if (message.body != null && message.body!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(message.body!, style: TextStyle(color: textColor, fontSize: 14)),
          ],
        ],
      );
    }

    if (message.type == 'file' && message.attachment != null) {
      final url = AppConstants.resolveAssetUrl(message.attachment!.url);
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.insert_drive_file_outlined, size: 20, color: textColor),
          const SizedBox(width: 8),
          Flexible(
            child: InkWell(
              onTap: url.isNotEmpty ? () => _openLink(context, url) : null,
              child: Text(
                message.attachment!.name ?? 'File',
                style: TextStyle(color: textColor, fontSize: 13.5),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
        ],
      );
    }

    return Text(
      message.body ?? '',
      style: TextStyle(color: textColor, fontSize: 14, height: 1.35),
    );
  }

  void _openLink(BuildContext context, String url) {
    // Fallback sederhana: salin URL agar bisa dibuka di browser.
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('File Terlampir'),
        content: Text(url, style: const TextStyle(fontSize: 12)),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }
}
