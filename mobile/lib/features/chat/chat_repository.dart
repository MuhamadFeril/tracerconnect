import 'dart:io';

import 'package:dio/dio.dart';
import 'package:encrypt/encrypt.dart' as enc;

import '../../core/network/api_client.dart';
import '../../core/services/chat_encryption.dart';
import '../../models/api_envelope.dart';
import '../../models/chat.dart';

class ChatRepository {
  final ApiClient _api = ApiClient.instance;

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
    return (env.data as List?)
        ?.whereType<Map<String, dynamic>>()
        .map(ChatConversation.fromJson)
        .toList() ?? [];
  }

  Future<ChatConversation> show(String conversationId) async {
    final data = await _api.get('/conversations/$conversationId');
    return ChatConversation.fromJson(data as Map<String, dynamic>);
  }

  Future<Paged<ChatMessage>> messages(String conversationId, {int page = 1}) async {
    final env = await _api.getEnvelope(
      '/conversations/$conversationId/messages',
      query: {'page': page, 'per_page': 30},
    );
    final items = (env.data as List?)
        ?.whereType<Map<String, dynamic>>()
        .map(ChatMessage.fromJson)
        .toList() ?? [];
    return Paged(
      items: items,
      meta: env.meta ??
          PaginationMeta(currentPage: 1, lastPage: 1, perPage: 30, total: items.length),
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

    // Encrypt body sebelum dikirim ke server (E2E).
    if (payload['body'] != null && payload['type'] == 'text') {
      final key = await _encryptionKey(conversationId);
      if (key != null) {
        payload['body'] = ChatEncryption.encryptBody(
          payload['body'] as String,
          key,
        );
      }
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

  // ── E2E Encryption helpers ──────────────────────────────────────────

  /// Derive encryption key untuk percakapan.
  /// Menggunakan user IDs dari percakapan untuk membuat key yang sama
  /// untuk kedua pihak.
  Future<enc.Key?> _encryptionKey(String conversationId) async {
    try {
      final conv = await show(conversationId);
      final myId = await _getMyId();
      final otherId = conv.otherId;
      if (myId == null || otherId == null) return null;
      return ChatEncryption.deriveConversationKey(
        conversationId: conversationId,
        myId: myId,
        otherId: otherId,
      );
    } catch (_) {
      return null;
    }
  }

  /// Decrypt body pesan dari server.
  Future<String?> decryptBody(String? body, String conversationId) async {
    if (body == null || body.isEmpty) return body;
    final key = await _encryptionKey(conversationId);
    if (key == null) return body;
    return ChatEncryption.decryptBody(body, key);
  }

  Future<String?> _getMyId() async {
    try {
      final data = await ApiClient.instance.get('/auth/me');
      return (data as Map<String, dynamic>)['id'] as String?;
    } catch (_) {
      return null;
    }
  }
}
