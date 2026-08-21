import 'dart:io';

import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../models/api_envelope.dart';
import '../../models/chat.dart';

class ChatRepository {
  final ApiClient _api = ApiClient.instance;

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
}
