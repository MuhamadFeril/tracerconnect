class Announcement {
  final String id;
  final String institutionId;
  final String title;
  final String body;
  final String status;
  final String? publishedAt;
  final String? createdAt;

  const Announcement({
    required this.id,
    required this.institutionId,
    required this.title,
    required this.body,
    required this.status,
    this.publishedAt,
    this.createdAt,
  });

  factory Announcement.fromJson(Map<String, dynamic> json) {
    return Announcement(
      id: json['id'] as String? ?? '',
      institutionId: json['institution_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      status: json['status'] as String? ?? 'published',
      publishedAt: json['published_at'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }
}
