class ConnectionSummary {
  final String status;
  final String? connectionId;

  const ConnectionSummary({required this.status, this.connectionId});

  factory ConnectionSummary.fromJson(Map<String, dynamic> json) {
    return ConnectionSummary(
      status: json['status'] as String? ?? 'none',
      connectionId: json['connection_id'] as String?,
    );
  }
}

/// Entri direktori alumni (`/networking/alumni`).
class NetworkingAlumni {
  final String id;
  final String userId;
  final String name;
  final String? avatarUrl;
  final String? department;
  final int? graduationYear;
  final String? employmentStatus;
  final String? companyName;
  final String? position;
  final String? businessField;
  final int? businessStartYear;
  final String? location;
  final String? workProvince;
  final String? workCity;
  final String? studyInstitution;
  final String? studyProgram;
  final int? studyEntryYear;
  final String? businessName;
  final String? businessAddress;
  final String? businessProvince;
  final String? businessCity;
  final ConnectionSummary connection;

  const NetworkingAlumni({
    required this.id,
    required this.userId,
    required this.name,
    this.avatarUrl,
    this.department,
    this.graduationYear,
    this.employmentStatus,
    this.companyName,
    this.position,
    this.businessField,
    this.businessStartYear,
    this.location,
    this.workProvince,
    this.workCity,
    this.studyInstitution,
    this.studyProgram,
    this.studyEntryYear,
    this.businessName,
    this.businessAddress,
    this.businessProvince,
    this.businessCity,
    required this.connection,
  });

  factory NetworkingAlumni.fromJson(Map<String, dynamic> json) {
    int? _parseInt(dynamic v) {
      if (v == null) return null;
      if (v is num) return v.toInt();
      if (v is String) return int.tryParse(v);
      return null;
    }
    return NetworkingAlumni(
      id: json['id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      avatarUrl: json['avatar_url'] as String?,
      department: json['department'] as String?,
      graduationYear: _parseInt(json['graduation_year']),
      employmentStatus: json['employment_status'] as String?,
      companyName: json['company_name'] as String?,
      position: json['position'] as String?,
      businessField: json['business_field'] as String?,
      businessStartYear: _parseInt(json['business_start_year']),
      location: json['location'] as String?,
      workProvince: json['work_province'] as String?,
      workCity: json['work_city'] as String?,
      studyInstitution: json['study_institution'] as String?,
      studyProgram: json['study_program'] as String?,
      studyEntryYear: _parseInt(json['study_entry_year']),
      businessName: json['business_name'] as String?,
      businessAddress: json['business_address'] as String?,
      businessProvince: json['business_province'] as String?,
      businessCity: json['business_city'] as String?,
      connection: json['connection'] is Map<String, dynamic>
          ? ConnectionSummary.fromJson(json['connection'] as Map<String, dynamic>)
          : const ConnectionSummary(status: 'none'),
    );
  }
}

/// Koneksi/permintaan dari sudut pandang user (`/networking/connections`).
class ConnectionItem {
  final String id;
  final String status;
  final String direction; // incoming | outgoing
  final String? createdAt;
  final String? userId;
  final String? userName;
  final String? userAvatarUrl;
  final String? department;
  final int? graduationYear;
  final String? employmentStatus;
  final String? companyName;
  final String? position;
  final String? businessField;
  final int? businessStartYear;
  final String? location;
  final String? workProvince;
  final String? workCity;
  final String? studyInstitution;
  final String? studyProgram;
  final int? studyEntryYear;
  final String? businessName;
  final String? businessAddress;
  final String? businessProvince;
  final String? businessCity;

  const ConnectionItem({
    required this.id,
    required this.status,
    required this.direction,
    this.createdAt,
    this.userId,
    this.userName,
    this.userAvatarUrl,
    this.department,
    this.graduationYear,
    this.employmentStatus,
    this.companyName,
    this.position,
    this.businessField,
    this.businessStartYear,
    this.location,
    this.workProvince,
    this.workCity,
    this.studyInstitution,
    this.studyProgram,
    this.studyEntryYear,
    this.businessName,
    this.businessAddress,
    this.businessProvince,
    this.businessCity,
  });

  bool get isIncoming => direction == 'incoming';

  factory ConnectionItem.fromJson(Map<String, dynamic> json) {
    int? _parseInt(dynamic v) {
      if (v == null) return null;
      if (v is num) return v.toInt();
      if (v is String) return int.tryParse(v);
      return null;
    }
    final user = json['user'] is Map<String, dynamic>
        ? json['user'] as Map<String, dynamic>
        : null;
    final alumni = json['alumni'] is Map<String, dynamic>
        ? json['alumni'] as Map<String, dynamic>
        : null;
    return ConnectionItem(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      direction: json['direction'] as String? ?? 'incoming',
      createdAt: json['created_at'] as String?,
      userId: user?['id'] as String?,
      userName: user?['name'] as String?,
      userAvatarUrl: user?['avatar_url'] as String?,
      department: alumni?['department'] as String?,
      graduationYear: _parseInt(alumni?['graduation_year']),
      employmentStatus: alumni?['employment_status'] as String?,
      companyName: alumni?['company_name'] as String?,
      position: alumni?['position'] as String?,
      businessField: alumni?['business_field'] as String?,
      businessStartYear: _parseInt(alumni?['business_start_year']),
      location: alumni?['location'] as String?,
      workProvince: alumni?['work_province'] as String?,
      workCity: alumni?['work_city'] as String?,
      studyInstitution: alumni?['study_institution'] as String?,
      studyProgram: alumni?['study_program'] as String?,
      studyEntryYear: _parseInt(alumni?['study_entry_year']),
      businessName: alumni?['business_name'] as String?,
      businessAddress: alumni?['business_address'] as String?,
      businessProvince: alumni?['business_province'] as String?,
      businessCity: alumni?['business_city'] as String?,
    );
  }
}

/// Pengguna yang diblokir (`/networking/blocked`).
class BlockedUserItem {
  final String id;
  final String? userId;
  final String? name;
  final String? avatarUrl;

  const BlockedUserItem({required this.id, this.userId, this.name, this.avatarUrl});

  factory BlockedUserItem.fromJson(Map<String, dynamic> json) {
    final user = json['user'] is Map<String, dynamic>
        ? json['user'] as Map<String, dynamic>
        : null;
    return BlockedUserItem(
      id: json['id'] as String? ?? '',
      userId: user?['id'] as String?,
      name: user?['name'] as String?,
      avatarUrl: user?['avatar_url'] as String?,
    );
  }
}
