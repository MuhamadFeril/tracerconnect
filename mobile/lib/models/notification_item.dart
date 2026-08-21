class NotificationItem {
  final String id;
  final String title;
  final String body;
  final String? url;
  final String kind;
  final String? readAt;
  final String? createdAt;

  const NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    this.url,
    required this.kind,
    this.readAt,
    this.createdAt,
  });

  bool get isRead => readAt != null;

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Notifikasi',
      body: json['body'] as String? ?? '',
      url: json['url'] as String?,
      kind: json['kind'] as String? ?? 'info',
      readAt: json['read_at'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }
}
