import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:encrypt/encrypt.dart' as enc;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/network/api_client.dart';
import '../../core/services/chat_encryption.dart';
import '../../models/api_envelope.dart';
import '../../models/chat.dart';

class ChatRepository {
  final ApiClient _api = ApiClient.instance;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // ── Local Cache ─────────────────────────────────────────────────────────

  /// Cache key prefix for conversations
  static const _cachePrefix = 'chat_conv_';
  static const _cacheExpiry = Duration(minutes: 5);

  /// Get cached conversations for instant display
  Future<List<ChatConversation>?> getCachedConversations() async {
    try {
      final cached = await _storage.read(key: '${_cachePrefix}list');
      if (cached == null) return null;
      final data = jsonDecode(cached) as Map<String, dynamic>;
      final expiry = DateTime.parse(data['expiry'] as String);
      if (DateTime.now().isAfter(expiry)) {
        await _storage.delete(key: '${_cachePrefix}list');
        return null;
      }
      final items = (data['items'] as List<dynamic>?)
          ?.whereType<Map<String, dynamic>>()
          .map(ChatConversation.fromJson)
          .toList();
      return items;
    } catch (_) {
      return null;
    }
  }

  /// Cache conversations to local storage
  Future<void> _cacheConversations(List<ChatConversation> conversations) async {
    try {
      final data = {
        'expiry': DateTime.now().add(_cacheExpiry).toIso8601String(),
        'items': conversations.map((c) => {
          'id': c.id,
          'type': c.type,
          'subject': c.subject,
          'job_vacancy_id': c.jobVacancyId,
          'created_at': c.createdAt,
          'updated_at': c.updatedAt,
          'last_message_at': c.lastMessageAt,
          'other': {
            'id': c.otherId,
            'name': c.otherName,
            'avatar_url': c.otherAvatarUrl,
          },
          'last_message': c.lastMessage != null ? {
            'id': c.lastMessage!.id,
            'conversation_id': c.lastMessage!.conversationId,
            'sender_id': c.lastMessage!.senderId,
            'type': c.lastMessage!.type,
            'body': c.lastMessage!.body,
            'is_deleted': c.lastMessage!.isDeleted,
            'is_mine': c.lastMessage!.isMine,
            'created_at': c.lastMessage!.createdAt,
          } : null,
          'unread_count': c.unreadCount,
          'muted': c.muted,
        }).toList(),
      };
      await _storage.write(key: '${_cachePrefix}list', value: jsonEncode(data));
    } catch (_) {
      // Cache write failed — not critical
    }
  }

  /// Get cached messages for a conversation
  Future<List<ChatMessage>?> getCachedMessages(String conversationId) async {
    try {
      final cached = await _storage.read(key: '${_cachePrefix}msg_$conversationId');
      if (cached == null) return null;
      final data = jsonDecode(cached) as Map<String, dynamic>;
      final expiry = DateTime.parse(data['expiry'] as String);
      if (DateTime.now().isAfter(expiry)) {
        await _storage.delete(key: '${_cachePrefix}msg_$conversationId');
        return null;
      }
      final items = (data['items'] as List<dynamic>?)
          ?.whereType<Map<String, dynamic>>()
          .map(ChatMessage.fromJson)
          .toList();
      return items;
    } catch (_) {
      return null;
    }
  }

  /// Cache messages to local storage (newest-first order, matching the API).
  Future<void> cacheMessages(String conversationId, List<ChatMessage> messages) async {
    try {
      final data = {
        'expiry': DateTime.now().add(_cacheExpiry).toIso8601String(),
        'items': messages.map((m) => {
          'id': m.id,
          'conversation_id': m.conversationId,
          'sender_id': m.senderId,
          'type': m.type,
          'body': m.body,
          'is_deleted': m.isDeleted,
          'is_mine': m.isMine,
          'created_at': m.createdAt,
        }).toList(),
      };
      await _storage.write(key: '${_cachePrefix}msg_$conversationId', value: jsonEncode(data));
    } catch (_) {
      // Cache write failed — not critical
    }
  }

  /// Clear cache for a conversation
  Future<void> clearCache(String conversationId) async {
    try {
      await _storage.delete(key: '${_cachePrefix}msg_$conversationId');
      await _storage.delete(key: '${_cachePrefix}list');
    } catch (_) {}
  }

  /// Total pesan belum dibaca lintas percakapan — paritas
  /// `useUnreadConversationsCount()` web (badge ikon chat).
  Future<int> unreadCount() async {
    final data = await _api.get('/conversations/unread-count');
    return ((data as Map<String, dynamic>)['count'] as num?)?.toInt() ?? 0;
  }

  Future<List<ChatConversation>> conversations({String? search}) async {
    final env = await _api.getEnvelope('/conversations', query: {
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
    });
    // Backend returns paginated data wrapped in {data: [...], links, meta}
    // when using →through() on a LengthAwarePaginator.
    final List<dynamic> items;
    if (env.data is Map<String, dynamic>) {
      items = (env.data as Map<String, dynamic>)['data'] as List<dynamic>? ?? [];
    } else {
      items = env.data as List<dynamic>? ?? [];
    }
    final conversations = items
        .whereType<Map<String, dynamic>>()
        .map(ChatConversation.fromJson)
        .toList();
    // Cache for next time
    await _cacheConversations(conversations);
    return conversations;
  }

  Future<ChatConversation> show(String conversationId) async {
    final data = await _api.get('/conversations/$conversationId');
    return ChatConversation.fromJson(data as Map<String, dynamic>);
  }

  /// Paginated message history.
  ///
  /// - No cursor: newest [perPage] messages, newest-first (initial load).
  /// - [before]: messages older than that cursor id (load older history).
  /// - [after]:  messages newer than that cursor id (delta polling — only the
  ///   messages that arrived since, ascending, so the caller can append them).
  ///
  /// The first page (no cursor) is cached for instant display on next open.
  Future<Paged<ChatMessage>> messages(
    String conversationId, {
    String? before,
    String? after,
    int perPage = 30,
  }) async {
    final query = <String, dynamic>{'per_page': perPage};
    if (before != null) query['before'] = before;
    if (after != null) query['after'] = after;

    final env = await _api.getEnvelope(
      '/conversations/$conversationId/messages',
      query: query,
    );

    final items = (env.data as List?)
        ?.whereType<Map<String, dynamic>>()
        .map(ChatMessage.fromJson)
        .toList() ?? [];

    // Cache the initial page (newest-first) for instant display next time.
    if (before == null && after == null && items.isNotEmpty) {
      await cacheMessages(conversationId, items);
    }

    return Paged(
      items: items,
      meta: env.meta ?? PaginationMeta.empty,
    );
  }

  Future<ChatConversation> start({String? userId, String? jobVacancyId}) async {
    final data = await _api.post('/conversations', data: {
      if (userId != null) 'user_id': userId,
      if (jobVacancyId != null) 'job_vacancy_id': jobVacancyId,
    });
    return ChatConversation.fromJson(data as Map<String, dynamic>);
  }

  Future<ChatMessage> sendMessage(
    String conversationId, {
    required String type,
    String? body,
    File? attachment,
  }) async {
    final payload = <String, dynamic>{
      'type': type,
      if (body != null && body.isNotEmpty) 'body': body,
    };

    if (attachment != null) {
      final form = FormData.fromMap({
        ...payload,
        'attachment': await MultipartFile.fromFile(
          attachment.path,
          filename: attachment.uri.pathSegments.last,
        ),
      });
      final data = await _api.postForm('/conversations/$conversationId/messages', form);
      return ChatMessage.fromJson(data as Map<String, dynamic>);
    }

    final data = await _api.post('/conversations/$conversationId/messages', data: payload);
    return ChatMessage.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteMessage(String messageId) async {
    await _api.delete('/messages/$messageId');
  }

  Future<void> markRead(String conversationId) async {
    await _api.post('/conversations/$conversationId/read');
  }

  Future<void> setMuted(String conversationId, bool muted) async {
    await _api.post('/conversations/$conversationId/mute', data: {'muted': muted});
  }

  Future<void> report(String conversationId, {required String reason, String? description}) async {
    await _api.post('/conversations/$conversationId/report', data: {
      'reason': reason,
      if (description != null && description.isNotEmpty) 'description': description,
    });
  }

  // ── Backward-compatible E2E decryption ──────────────────────────────

  /// Decrypt a message body that may have been encrypted with the old E2E
  /// system. Returns the original plaintext for display. New messages are
  /// sent as plaintext, so for the common case (plaintext) this returns
  /// immediately WITHOUT any network call — critical for chat performance
  /// since this used to fire two HTTP requests per message on every rebuild.
  Future<String?> decryptBody(String? body, String conversationId) async {
    if (body == null || body.isEmpty) return body;
    if (!ChatEncryption.isEncrypted(body)) return body; // plaintext
    final key = await _encryptionKey(conversationId);
    if (key == null) return body;
    return ChatEncryption.decryptBody(body, key);
  }

  /// In-memory caches so legacy-encrypted conversations don't re-hit the
  /// network for the key on every message render.
  static String? _cachedMyId;
  static final Map<String, String?> _otherIdCache = {};

  /// Derive encryption key for a conversation — matches the old E2E logic.
  /// Both the viewer id and the other-party id are cached to avoid the
  /// `/auth/me` and `/conversations/{id}` round-trips on every message.
  Future<enc.Key?> _encryptionKey(String conversationId) async {
    try {
      final myId = _cachedMyId ??= await _fetchMyId();
      if (myId == null) return null;
      final otherId = await _otherIdFor(conversationId);
      if (otherId == null) return null;
      return ChatEncryption.deriveConversationKey(
        conversationId: conversationId,
        myId: myId,
        otherId: otherId,
      );
    } catch (_) {
      return null;
    }
  }

  Future<String?> _otherIdFor(String conversationId) async {
    if (_otherIdCache.containsKey(conversationId)) {
      return _otherIdCache[conversationId];
    }
    final otherId = await _fetchOtherId(conversationId);
    _otherIdCache[conversationId] = otherId;
    return otherId;
  }

  Future<String?> _fetchMyId() async {
    try {
      final data = await ApiClient.instance.get('/auth/me');
      return (data as Map<String, dynamic>)['id'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<String?> _fetchOtherId(String conversationId) async {
    try {
      final conv = await show(conversationId);
      return conv.otherId;
    } catch (_) {
      return null;
    }
  }
}
