import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_error.dart';
import '../../models/institution.dart';
import '../../models/region.dart';
import '../../models/university.dart';

/// Provider for institution options with autoDispose so errors aren't cached
/// forever. Using keepAlive to prevent disposal during a single form session
/// while still allowing retry via invalidation.
final institutionOptionsProvider =
    FutureProvider.autoDispose<List<InstitutionOption>>((ref) async {
  try {
    final data = await ApiClient.instance.get('/institutions/options');
    final list = data as List;
    return list
        .whereType<Map<String, dynamic>>()
        .map(InstitutionOption.fromJson)
        .toList();
  } on ApiException catch (e) {
    // Re-throw with a friendlier message for the UI layer.
    throw ApiException(
      statusCode: e.statusCode,
      message: 'Gagal memuat daftar institusi. Periksa koneksi Anda dan coba lagi.',
      errors: e.errors,
    );
  } on Exception {
    throw const ApiException(
      message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
    );
  }
});

final provincesProvider = FutureProvider<List<RegionItem>>((ref) async {
  final data = await ApiClient.instance.get('/regions/provinces');
  final list = data as List;
  return list.whereType<Map<String, dynamic>>().map(RegionItem.fromJson).toList();
});

final regenciesProvider =
    FutureProvider.family<List<RegionItem>, String>((ref, provinceId) async {
  final data = await ApiClient.instance.get('/regions/provinces/$provinceId/regencies');
  final list = data as List;
  return list.whereType<Map<String, dynamic>>().map(RegionItem.fromJson).toList();
});

final districtsProvider =
    FutureProvider.family<List<RegionItem>, String>((ref, regencyId) async {
  final data = await ApiClient.instance.get('/regions/regencies/$regencyId/districts');
  final list = data as List;
  return list.whereType<Map<String, dynamic>>().map(RegionItem.fromJson).toList();
});

/// Pencarian universitas server-side (di-debounce di UI). Dataset nasional
/// (5.000+ kampus) tidak pernah diunduh sekaligus — endpoint membatasi
/// hasilnya (maks. 100) dan filter berjalan di server lewat ?search=.
final universitiesSearchProvider =
    FutureProvider.family<List<University>, String>((ref, query) async {
  final data = await ApiClient.instance.get('/universities', query: {
    if (query.trim().isNotEmpty) 'search': query.trim(),
  });
  final list = data as List;
  return list.whereType<Map<String, dynamic>>().map(University.fromJson).toList();
});

/// Program studi untuk satu universitas.
final studyProgramsProvider =
    FutureProvider.family<List<StudyProgram>, String>((ref, universityId) async {
  final data = await ApiClient.instance.get('/universities/$universityId/study-programs');
  final list = data as List;
  return list.whereType<Map<String, dynamic>>().map(StudyProgram.fromJson).toList();
});
