import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/chat.dart';
import 'chat_messages_notifier.dart';
import 'chat_repository.dart';

final chatRepositoryProvider = Provider<ChatRepository>((ref) => ChatRepository());

/// Daftar percakapan user — tampilkan cache lokal instan, lalu perbarui dari
/// server di background (satu emit cache, lalu satu emit data segar).
/// Bila refresh gagal, cache tetap ditampilkan (tidak berpindah ke error).
final conversationsProvider = StreamProvider<List<ChatConversation>>(
  (ref) async* {
    final repo = ref.watch(chatRepositoryProvider);
    final cached = await repo.getCachedConversations();
    if (cached != null && cached.isNotEmpty) yield cached; // instan
    try {
      yield await repo.conversations(); // segar (dan memperbarui cache)
    } catch (_) {
      if (cached == null || cached.isEmpty) yield <ChatConversation>[];
    }
  },
);

/// Detail satu percakapan.
final conversationProvider = FutureProvider.family<ChatConversation, String>(
  (ref, id) => ref.watch(chatRepositoryProvider).show(id),
);

/// Pesan dalam satu percakapan — dikelola oleh [ChatMessagesNotifier]
/// (cache-first, polling delta, optimistic send, load older).
final chatMessagesNotifierProvider =
    NotifierProvider.family<ChatMessagesNotifier, ChatMessagesState, String>(
  ChatMessagesNotifier.new,
);

/// Jumlah pesan belum dibaca lintas percakapan — polling tiap 5 detik.
final chatUnreadCountProvider = StreamProvider<int>((ref) async* {
  final repo = ref.watch(chatRepositoryProvider);
  yield await repo.unreadCount();
  await for (final _ in Stream<void>.periodic(const Duration(seconds: 5))) {
    try {
      yield await repo.unreadCount();
    } catch (_) {
      // Gagal satu siklus — pertahankan nilai terakhir.
    }
  }
});
