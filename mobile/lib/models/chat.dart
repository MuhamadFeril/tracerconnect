/// Lampiran pesan (`/conversations/{id}/messages`).
class ChatAttachment {
  final String? name;
  final String? mime;
  final int? size;
  final String? url;

  const ChatAttachment({this.name, this.mime, this.size, this.url});

  factory ChatAttachment.fromJson(Map<String, dynamic> json) {
    return ChatAttachment(
      name: json['name'] as String?,
      mime: json['mime'] as String?,
      size: (json['size'] as num?)?.toInt(),
      url: json['url'] as String?,
    );
  }
}

/// Pesan chat.
class ChatMessage {
  final String id;
  final String conversationId;
  final String? senderId;
  final String type; // text | image | file | system
  final String? body;
  final ChatAttachment? attachment;
  final bool isDeleted;
  final bool isMine;
  final String? createdAt;

  const ChatMessage({
    required this.id,
    required this.conversationId,
    this.senderId,
    required this.type,
    this.body,
    this.attachment,
    required this.isDeleted,
    required this.isMine,
    this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String? ?? '',
      conversationId: json['conversation_id'] as String? ?? '',
      senderId: json['sender_id'] as String?,
      type: json['type'] as String? ?? 'text',
      body: json['body'] as String?,
      attachment: json['attachment'] is Map<String, dynamic>
          ? ChatAttachment.fromJson(json['attachment'] as Map<String, dynamic>)
          : null,
      isDeleted: json['is_deleted'] as bool? ?? false,
      isMine: json['is_mine'] as bool? ?? false,
      createdAt: json['created_at'] as String?,
    );
  }
}

/// Ringkasan lowongan terkait percakapan.
class ChatJob {
  final String id;
  final String? title;
  final String? companyName;

  const ChatJob({required this.id, this.title, this.companyName});

  factory ChatJob.fromJson(Map<String, dynamic> json) {
    return ChatJob(
      id: json['id'] as String? ?? '',
      title: json['title'] as String?,
      companyName: json['company_name'] as String?,
    );
  }
}

/// Percakapan dari sudut pandang user (`/conversations`).
class ChatConversation {
  final String id;
  final String type;
  final String? subject;
  final String? jobVacancyId;
  final String? createdAt;
  final String? updatedAt;
  final String? lastMessageAt;
  final String? otherId;
  final String? otherName;
  final String? otherAvatarUrl;
  final ChatJob? job;
  final ChatMessage? lastMessage;
  final int unreadCount;
  final bool muted;

  const ChatConversation({
    required this.id,
    required this.type,
    this.subject,
    this.jobVacancyId,
    this.createdAt,
    this.updatedAt,
    this.lastMessageAt,
    this.otherId,
    this.otherName,
    this.otherAvatarUrl,
    this.job,
    this.lastMessage,
    required this.unreadCount,
    required this.muted,
  });

  String get title => otherName ?? 'Percakapan';

  factory ChatConversation.fromJson(Map<String, dynamic> json) {
    final other = json['other'] is Map<String, dynamic>
        ? json['other'] as Map<String, dynamic>
        : null;
    final job = json['job'] is Map<String, dynamic>
        ? json['job'] as Map<String, dynamic>
        : null;
    return ChatConversation(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'direct',
      subject: json['subject'] as String?,
      jobVacancyId: json['job_vacancy_id'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
      lastMessageAt: json['last_message_at'] as String?,
      otherId: other?['id'] as String?,
      otherName: other?['name'] as String?,
      otherAvatarUrl: other?['avatar_url'] as String?,
      job: job != null ? ChatJob.fromJson(job) : null,
      lastMessage: json['last_message'] is Map<String, dynamic>
          ? ChatMessage.fromJson(json['last_message'] as Map<String, dynamic>)
          : null,
      unreadCount: (json['unread_count'] as num?)?.toInt() ?? 0,
      muted: json['muted'] as bool? ?? false,
    );
  }
}
