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
