class EventItem {
  final String id;
  final String institutionId;
  final String title;
  final String? description;
  final String? location;
  final String? startsAt;
  final String? endsAt;
  final String status;
  final bool? registered;
  final String? createdAt;

  const EventItem({
    required this.id,
    required this.institutionId,
    required this.title,
    this.description,
    this.location,
    this.startsAt,
    this.endsAt,
    required this.status,
    this.registered,
    this.createdAt,
  });

  factory EventItem.fromJson(Map<String, dynamic> json) {
    return EventItem(
      id: json['id'] as String? ?? '',
      institutionId: json['institution_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      location: json['location'] as String?,
      startsAt: json['starts_at'] as String?,
      endsAt: json['ends_at'] as String?,
      status: json['status'] as String? ?? 'published',
      registered: json['registered'] as bool?,
      createdAt: json['created_at'] as String?,
    );
  }
}
