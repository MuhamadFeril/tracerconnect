import 'dart:async';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/constants/app_constants.dart';
import '../../core/services/chat_encryption.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/chat.dart';
import '../../shared/widgets/app_avatar.dart';
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
  final _focusNode = FocusNode();
  File? _pendingImage;
  File? _pendingFile;
  String? _pendingFileName;
  bool _atBottom = true;

  /// Cached decrypted messages: id → decrypted body.
  final Map<String, String> _decryptedCache = {};

  String get _conversationId => widget.conversationId;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(() {
      if (_scrollController.hasClients) {
        _atBottom = _scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 120;
      }
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _maybeScrollToBottom({bool force = false}) {
    if (!_scrollController.hasClients) return;
    if (!force && !_atBottom) return;
    _scrollController.animateTo(
      _scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
    );
  }

  /// Decrypt message body if it was encrypted with the old E2E system.
  /// Plaintext messages (the common case) return immediately with no network.
  Future<void> _decryptIfNeeded(ChatMessage msg) async {
    if (_decryptedCache.containsKey(msg.id)) return;
    if (msg.body == null || !ChatEncryption.isEncrypted(msg.body!)) return;
    final repo = ref.read(chatRepositoryProvider);
    final decrypted = await repo.decryptBody(msg.body, _conversationId);
    if (decrypted != null && decrypted != msg.body) {
      _decryptedCache[msg.id] = decrypted;
    }
  }

  String _getBody(ChatMessage msg) {
    if (_decryptedCache.containsKey(msg.id)) return _decryptedCache[msg.id]!;
    final body = msg.body ?? '';
    if (body.isNotEmpty && ChatEncryption.isEncrypted(body)) {
      return '\u{1F512} Pesan terenkripsi';
    }
    return body;
  }

  Future<void> _send() async {
    final body = _messageController.text.trim();
    if (body.isEmpty && _pendingImage == null && _pendingFile == null) return;

    final savedImage = _pendingImage;
    final savedFile = _pendingFile;
    final savedName = _pendingFileName;
    final type = savedImage != null
        ? 'image'
        : (savedFile != null ? 'file' : 'text');

    setState(() {
      _messageController.clear();
      _pendingImage = null;
      _pendingFile = null;
      _pendingFileName = null;
    });

    final notifier =
        ref.read(chatMessagesNotifierProvider(_conversationId).notifier);
    await notifier.send(
      _conversationId,
      type: type,
      body: body.isEmpty ? null : body,
      attachment: savedImage ?? savedFile,
      attachmentName: savedName,
    );
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      imageQuality: 85,
    );
    if (file == null || !mounted) return;
    setState(() {
      _pendingImage = File(file.path);
      _pendingFile = null;
      _pendingFileName = null;
    });
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip'],
    );
    if (result == null || result.files.single.path == null || !mounted) return;
    setState(() {
      _pendingFile = File(result.files.single.path!);
      _pendingFileName = result.files.single.name;
      _pendingImage = null;
    });
  }

  Future<void> _pickCamera() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1600,
      imageQuality: 85,
    );
    if (file == null || !mounted) return;
    setState(() => _pendingImage = File(file.path));
  }

  Future<void> _deleteMessage(ChatMessage message) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus Pesan?'),
        content: const Text('Pesan hanya akan dihapus untuk Anda.',
            style: TextStyle(fontSize: 14)),
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
      ref
          .read(chatMessagesNotifierProvider(_conversationId).notifier)
          .markDeleted(message.id);
      ref.invalidate(conversationsProvider);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal menghapus pesan')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final conversation = ref.watch(conversationProvider(_conversationId));
    final msgs = ref.watch(chatMessagesNotifierProvider(_conversationId));
    final notifier =
        ref.read(chatMessagesNotifierProvider(_conversationId).notifier);

    // Auto-scroll ke bawah saat ada pesan baru (kirim / polling), asal user
    // sedang di bawah atau ini pemuatan pertama.
    ref.listen(chatMessagesNotifierProvider(_conversationId), (prev, next) {
      final had = prev?.messages.length ?? 0;
      final now = next.messages.length;
      if (now > had || prev == null && now > 0) {
        WidgetsBinding.instance.addPostFrameCallback(
          (_) => _maybeScrollToBottom(force: prev == null),
        );
      }
    });

    final messages = msgs.messages;

    return Scaffold(
      backgroundColor: const Color(0xFFECE5DD),
      appBar: _buildAppBar(conversation),
      body: Column(
        children: [
          Expanded(
            child: Builder(
              builder: (context) {
                if (msgs.loadingInitial && messages.isEmpty) {
                  return const LoadingView(label: 'Memuat pesan…');
                }
                if (msgs.initialError && messages.isEmpty) {
                  return Center(
                    child: Text(
                      'Gagal memuat pesan.',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 14,
                      ),
                    ),
                  );
                }
                if (messages.isEmpty) {
                  return Center(
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      margin: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.85),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.chat_bubble_outline_rounded,
                              size: 28, color: Colors.grey.shade400),
                          const SizedBox(height: 8),
                          Text(
                            'Belum ada pesan',
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Kirim sapaan pertama Anda.',
                            style: TextStyle(
                              color: Colors.grey.shade500,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                  itemCount: messages.length + 1,
                  itemBuilder: (context, index) {
                    // Header (atas): indikator / tombol "muat pesan lama".
                    if (index == 0) {
                      if (msgs.loadingOlder) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 10),
                          child: Center(
                            child: SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        );
                      }
                      if (msgs.hasMoreOlder) {
                        return Center(
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.75),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: TextButton(
                              onPressed: () => notifier.loadOlder(_conversationId),
                              child: const Text('Muat pesan lama',
                                  style: TextStyle(fontSize: 12)),
                            ),
                          ),
                        );
                      }
                      return const SizedBox.shrink();
                    }

                    final message = messages[index - 1];
                    if (message.body != null &&
                        ChatEncryption.isEncrypted(message.body!)) {
                      unawaited(_decryptIfNeeded(message));
                    }

                    final showDate = index - 1 == 0 ||
                        _isNewDay(messages[index - 2], message);

                    return Column(
                      children: [
                        if (showDate) _DateSeparator(date: message.createdAt),
                        _MessageBubble(
                          message: message,
                          displayBody: _getBody(message),
                          isOptimistic: message.id.startsWith('opt_'),
                          onDelete: message.isMine && !message.id.startsWith('opt_')
                              ? () => _deleteMessage(message)
                              : null,
                          onRetry: message.status == 'failed'
                              ? () => notifier.retry(_conversationId, message.id)
                              : null,
                        ),
                      ],
                    );
                  },
                );
              },
            ),
          ),
          if (_pendingImage != null)
            Container(
              margin: const EdgeInsets.fromLTRB(12, 4, 12, 0),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFD1D5DB)),
              ),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(
                      _pendingImage!,
                      width: 48,
                      height: 48,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Foto siap dikirim',
                      style: TextStyle(
                          fontSize: 13, color: AppColors.textSecondary),
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
          if (_pendingFile != null)
            Container(
              margin: const EdgeInsets.fromLTRB(12, 4, 12, 0),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFD1D5DB)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.insert_drive_file_outlined,
                        color: AppColors.primary, size: 24),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _pendingFileName ?? 'File',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ),
                  IconButton(
                    onPressed: () => setState(() {
                      _pendingFile = null;
                      _pendingFileName = null;
                    }),
                    icon: const Icon(Icons.close_rounded, size: 18),
                    color: AppColors.textMuted,
                  ),
                ],
              ),
            ),
          _Composer(
            controller: _messageController,
            focusNode: _focusNode,
            onSend: _send,
            onCamera: _pickCamera,
            onGallery: _pickImage,
            onFile: _pickFile,
          ),
        ],
      ),
    );
  }

  bool _isNewDay(ChatMessage prev, ChatMessage current) {
    if (prev.createdAt == null || current.createdAt == null) return false;
    return prev.createdAt!.substring(0, 10) !=
        current.createdAt!.substring(0, 10);
  }

  PreferredSizeWidget _buildAppBar(AsyncValue<ChatConversation> conv) {
    return AppBar(
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      titleSpacing: 0,
      title: conv.maybeWhen(
        data: (c) => Row(
          children: [
            AppAvatar(
              imageUrl: c.otherAvatarUrl,
              name: c.otherName,
              size: 36,
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
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    'online',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.white.withValues(alpha: 0.65),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        orElse: () => const Text('Percakapan'),
      ),
      actions: [
        conv.maybeWhen(
          data: (c) => PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert_rounded),
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
                    ),
                    const SizedBox(width: 10),
                    Text(c.muted ? 'Nyalakan notifikasi' : 'Bisukan'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'report',
                child: Row(
                  children: [
                    Icon(Icons.flag_outlined, size: 18),
                    SizedBox(width: 10),
                    Text('Laporkan'),
                  ],
                ),
              ),
            ],
          ),
          orElse: () => const SizedBox.shrink(),
        ),
      ],
    );
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
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(
              conversation.muted ? 'Notifikasi diaktifkan' : 'Percakapan dibisukan')));
    } catch (_) {}
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
            children: [
              DropdownButtonFormField<String>(
                initialValue: reason,
                decoration: const InputDecoration(labelText: 'Alasan'),
                items: const [
                  DropdownMenuItem(value: 'spam', child: Text('Spam')),
                  DropdownMenuItem(value: 'abusive', child: Text('Pelecehan')),
                  DropdownMenuItem(value: 'scam', child: Text('Penipuan')),
                  DropdownMenuItem(value: 'other', child: Text('Lainnya')),
                ],
                onChanged: (v) => setDialogState(() => reason = v ?? 'spam'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Detail (opsional)'),
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
              child: const Text('Kirim'),
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
    } catch (_) {}
  }
}

// ─── Message Bubble (WhatsApp-style) ─────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final String displayBody;
  final VoidCallback? onDelete;
  final VoidCallback? onRetry;
  final bool isOptimistic;

  const _MessageBubble({
    required this.message,
    required this.displayBody,
    this.onDelete,
    this.onRetry,
    this.isOptimistic = false,
  });

  @override
  Widget build(BuildContext context) {
    final mine = message.isMine;
    final time = _formatTime(message.createdAt);

    return GestureDetector(
      onLongPress: onDelete != null ? () => _showOptions(context) : null,
      onTap: onRetry,
      child: Align(
        alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.78,
          ),
          margin: EdgeInsets.only(
            left: mine ? 48 : 6,
            right: mine ? 6 : 48,
            top: 1,
            bottom: 1,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          decoration: BoxDecoration(
            color: mine ? AppColors.primaryLight : Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(8),
              topRight: const Radius.circular(8),
              bottomLeft: Radius.circular(mine ? 8 : 0),
              bottomRight: Radius.circular(mine ? 0 : 8),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 2,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (message.isDeleted)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.block, size: 14, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Text(
                      'Pesan dihapus',
                      style: TextStyle(
                        color: Colors.grey.shade500,
                        fontStyle: FontStyle.italic,
                        fontSize: 13,
                      ),
                    ),
                  ],
                )
              else if (message.type == 'image' &&
                  message.attachment != null &&
                  message.attachment!.url != null)
                _ImageContent(message: message)
              else if (message.type == 'file' && message.attachment != null)
                _FileContent(message: message)
              else if (displayBody.isNotEmpty)
                Text(
                  displayBody,
                  style: const TextStyle(
                    color: Color(0xFF303030),
                    fontSize: 14.5,
                    height: 1.35,
                  ),
                )
              else
                Text(
                  'Pesan kosong',
                  style: TextStyle(
                    color: Colors.grey.shade500,
                    fontStyle: FontStyle.italic,
                    fontSize: 13,
                  ),
                ),

              const SizedBox(height: 2),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isOptimistic || message.status == 'sending')
                    const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 1.5,
                        color: Colors.white70,
                      ),
                    )
                  else if (message.status == 'failed')
                    Icon(
                      Icons.error_outline_rounded,
                      size: 16,
                      color: Colors.red.shade300,
                    )
                  else if (mine) ...[
                    Icon(
                      message.isDeleted
                          ? Icons.block
                          : Icons.done_all_rounded,
                      size: 16,
                      color: message.isDeleted
                          ? Colors.grey.shade400
                          : const Color(0xFF53BDEB),
                    ),
                  ],
                  if (mine) const SizedBox(width: 3),
                  Text(
                    time,
                    style: TextStyle(
                      fontSize: 11,
                      color: mine
                          ? Colors.grey.shade600
                          : Colors.grey.shade500,
                    ),
                  ),
                ],
              ),
              if (message.status == 'failed')
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    'Gagal · Ketuk untuk coba lagi',
                    style: TextStyle(
                      fontSize: 10.5,
                      color: Colors.red.shade300,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showOptions(BuildContext context) {
    if (onDelete == null) return;
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.delete_outline, color: AppColors.danger),
              title: const Text('Hapus pesan'),
              onTap: () {
                Navigator.of(ctx).pop();
                onDelete?.call();
              },
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }
}

// ─── Date Separator ──────────────────────────────────────────────────────────

class _DateSeparator extends StatelessWidget {
  final String? date;
  const _DateSeparator({required this.date});

  @override
  Widget build(BuildContext context) {
    final label = _formatDate(date);
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 3,
            ),
          ],
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final target = DateTime(dt.year, dt.month, dt.day);
      final diff = today.difference(target).inDays;

      if (diff == 0) return 'Hari ini';
      if (diff == 1) return 'Kemarin';
      return Formatters.formatDateFromString(dateStr);
    } catch (_) {
      return '';
    }
  }
}

// ─── Image Content ───────────────────────────────────────────────────────────

class _ImageContent extends StatelessWidget {
  final ChatMessage message;
  const _ImageContent({required this.message});

  @override
  Widget build(BuildContext context) {
    final url = AppConstants.resolveAssetUrl(message.attachment!.url);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => showDialog(
            context: context,
            builder: (_) => Dialog(
              backgroundColor: Colors.black,
              insetPadding: EdgeInsets.zero,
              child: InteractiveViewer(
                child: Image.network(url, fit: BoxFit.contain),
              ),
            ),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: Image.network(
              url,
              width: 240,
              fit: BoxFit.cover,
              loadingBuilder: (_, child, progress) {
                if (progress == null) return child;
                return Container(
                  width: 240,
                  height: 160,
                  alignment: Alignment.center,
                  child: const CircularProgressIndicator(strokeWidth: 2),
                );
              },
              errorBuilder: (_, __, ___) => Container(
                width: 240,
                height: 120,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.broken_image_outlined,
                    color: AppColors.textMuted),
              ),
            ),
          ),
        ),
        if (message.body != null && message.body!.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            message.body!,
            style: const TextStyle(color: Color(0xFF303030), fontSize: 14),
          ),
        ],
      ],
    );
  }
}

// ─── File Content ────────────────────────────────────────────────────────────

class _FileContent extends StatelessWidget {
  final ChatMessage message;
  const _FileContent({required this.message});

  @override
  Widget build(BuildContext context) {
    final name = message.attachment?.name ?? 'File';
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.insert_drive_file_outlined, size: 22, color: Colors.grey.shade700),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            name,
            style: const TextStyle(color: Color(0xFF303030), fontSize: 13.5),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

// ─── Composer (WhatsApp-style) ───────────────────────────────────────────────

class _Composer extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final VoidCallback onSend;
  final VoidCallback onCamera;
  final VoidCallback onGallery;
  final VoidCallback onFile;

  const _Composer({
    required this.controller,
    required this.focusNode,
    required this.onSend,
    required this.onCamera,
    required this.onGallery,
    required this.onFile,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF0F0F0),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            IconButton(
              onPressed: () => _showAttachmentSheet(context),
              icon: const Icon(Icons.add_circle_outline_rounded),
              color: AppColors.primary,
              iconSize: 26,
            ),
            Expanded(
              child: Container(
                constraints: const BoxConstraints(minHeight: 42),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  minLines: 1,
                  maxLines: 5,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => onSend(),
                  style: const TextStyle(fontSize: 15),
                  decoration: const InputDecoration(
                    hintText: 'Pesan',
                    hintStyle: TextStyle(color: Color(0xFF999999)),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
            IconButton(
              onPressed: onSend,
              icon: const Icon(Icons.send_rounded),
              color: AppColors.primary,
              iconSize: 24,
            ),
          ],
        ),
      ),
    );
  }

  void _showAttachmentSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _AttachmentOption(
                icon: Icons.camera_alt_rounded,
                label: 'Kamera',
                color: AppColors.primary,
                onTap: () {
                  Navigator.of(ctx).pop();
                  onCamera();
                },
              ),
              _AttachmentOption(
                icon: Icons.photo_library_rounded,
                label: 'Galeri',
                color: AppColors.primaryDark,
                onTap: () {
                  Navigator.of(ctx).pop();
                  onGallery();
                },
              ),
              _AttachmentOption(
                icon: Icons.attach_file_rounded,
                label: 'File',
                color: AppColors.info,
                onTap: () {
                  Navigator.of(ctx).pop();
                  onFile();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AttachmentOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _AttachmentOption({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.white, size: 26),
          ),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}
