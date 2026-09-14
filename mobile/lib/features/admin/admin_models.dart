/// Alumni list item returned by admin `GET /alumni`.
class AlumniListItem {
  final String id;
  final String name;
  final String? email;
  final String? nisNim;
  final String? department;
  final int? graduationYear;
  final String? employmentStatus;
  final String? avatarUrl;

  const AlumniListItem({
    required this.id,
    required this.name,
    this.email,
    this.nisNim,
    this.department,
    this.graduationYear,
    this.employmentStatus,
    this.avatarUrl,
  });

  factory AlumniListItem.fromJson(Map<String, dynamic> json) {
    return AlumniListItem(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String?,
      nisNim: json['nis_nim'] as String?,
      department: json['department'] as String?,
      graduationYear: (json['graduation_year'] as num?)?.toInt(),
      employmentStatus: json['employment_status'] as String?,
      avatarUrl: json['avatar_url'] as String?,
    );
  }
}

/// User list item returned by admin `GET /users`.
class UserListItem {
  final String id;
  final String name;
  final String email;
  final List<String> roles;
  final String? avatarUrl;
  final bool isActive;

  const UserListItem({
    required this.id,
    required this.name,
    required this.email,
    this.roles = const [],
    this.avatarUrl,
    this.isActive = true,
  });

  factory UserListItem.fromJson(Map<String, dynamic> json) {
    return UserListItem(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      roles: (json['roles'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      avatarUrl: json['avatar_url'] as String?,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}
