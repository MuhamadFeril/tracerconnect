import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/api_envelope.dart';
import '../../models/chat.dart';
import 'chat_repository.dart';

final chatRepositoryProvider = Provider<ChatRepository>((ref) => ChatRepository());

/// Daftar percakapan user.
final conversationsProvider = FutureProvider<List<ChatConversation>>(
  (ref) => ref.watch(chatRepositoryProvider).conversations(),
);

/// Detail satu percakapan.
final conversationProvider = FutureProvider.family<ChatConversation, String>(
  (ref, id) => ref.watch(chatRepositoryProvider).show(id),
);

/// Halaman pesan (1 = terbaru).
final conversationMessagesProvider =
    FutureProvider.family<Paged<ChatMessage>, ({String conversationId, int page})>(
  (ref, query) => ref
      .watch(chatRepositoryProvider)
      .messages(query.conversationId, page: query.page),
);

/// Streaming messages for a conversation — auto-refreshes every 3 seconds.
/// Unlike invalidation-based polling, errors are swallowed so the UI
/// retains the last known data and doesn't flash to error state.
final conversationMessagesStreamProvider =
    StreamProvider.family<Paged<ChatMessage>, ({String conversationId, int page})>(
  (ref, query) async* {
    final repo = ref.watch(chatRepositoryProvider);
    // Initial fetch
    yield await repo.messages(query.conversationId, page: query.page);
    // Poll every 3 seconds
    await for (final _ in Stream<void>.periodic(const Duration(seconds: 3))) {
      try {
        yield await repo.messages(query.conversationId, page: query.page);
      } catch (_) {
        // Keep last known data on transient errors (throttle, network hiccup).
      }
    }
  },
);

/// Jumlah pesan belum dibaca lintas percakapan — polling tiap 10 detik,
/// paritas `useUnreadConversationsCount()` di web (refetchInterval 10 dtk).
/// Tanpa ini, badge pesan baru tidak pernah berubah selama aplikasi dibuka.
final chatUnreadCountProvider = StreamProvider<int>((ref) async* {
  final repo = ref.watch(chatRepositoryProvider);
  yield await repo.unreadCount();
  await for (final _ in Stream<void>.periodic(const Duration(seconds: 10))) {
    try {
      yield await repo.unreadCount();
    } catch (_) {
      // Gagal satu siklus (mis. throttle) — pertahankan nilai terakhir.
    }
  }
});
