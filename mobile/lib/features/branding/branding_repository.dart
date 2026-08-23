import '../../core/network/api_client.dart';

class InstitutionBranding {
  final String id;
  final String name;
  final String? logoPath;
  final String? logoUrl;
  final String? primaryColor;
  final String? faviconPath;
  final String? coverImagePath;
  final String? coverImageUrl;
  final String? reportHeader;
  final String? reportFooter;
  final String? customFooter;
  final String? contactEmail;
  final String? contactPhone;
  final String? about;

  const InstitutionBranding({
    required this.id,
    required this.name,
    this.logoPath,
    this.logoUrl,
    this.primaryColor,
    this.faviconPath,
    this.coverImagePath,
    this.coverImageUrl,
    this.reportHeader,
    this.reportFooter,
    this.customFooter,
    this.contactEmail,
    this.contactPhone,
    this.about,
  });

  factory InstitutionBranding.fromJson(Map<String, dynamic> json) {
    return InstitutionBranding(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      logoPath: json['logo_path'] as String?,
      logoUrl: json['logo_url'] as String?,
      primaryColor: json['primary_color'] as String?,
      faviconPath: json['favicon_path'] as String?,
      coverImagePath: json['cover_image_path'] as String?,
      coverImageUrl: json['cover_image_url'] as String?,
      reportHeader: json['report_header'] as String?,
      reportFooter: json['report_footer'] as String?,
      customFooter: json['custom_footer'] as String?,
      contactEmail: json['contact_email'] as String?,
      contactPhone: json['contact_phone'] as String?,
      about: json['about'] as String?,
    );
  }
}

class BrandingRepository {
  final ApiClient _api = ApiClient.instance;

  Future<InstitutionBranding> getBranding() async {
    final data = await _api.get('/institution-branding');
    return InstitutionBranding.fromJson(data as Map<String, dynamic>);
  }
}
