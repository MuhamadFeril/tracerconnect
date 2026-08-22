/// Item wilayah (provinsi/kabupaten/kecamatan) dari endpoint publik region.
class RegionItem {
  final String id;
  final String code;
  final String name;

  const RegionItem({required this.id, required this.code, required this.name});

  factory RegionItem.fromJson(Map<String, dynamic> json) {
    return RegionItem(
      id: '${json['id']}',
      code: '${json['code']}',
      name: json['name'] as String? ?? '',
    );
  }
}
