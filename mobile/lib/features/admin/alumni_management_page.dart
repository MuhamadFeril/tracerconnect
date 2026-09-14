import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'admin_models.dart';
import 'admin_repository.dart';

final _adminRepoProvider = Provider((_) => AdminRepository());

final _alumniProvider =
    FutureProvider.autoDispose.family<List<AlumniListItem>, String>(
  (ref, search) async {
    final repo = ref.read(_adminRepoProvider);
    final result = await repo.listAlumni(
      search: search.isEmpty ? null : search,
    );
    return result.items;
  },
);

class AlumniManagementPage extends ConsumerStatefulWidget {
  const AlumniManagementPage({super.key});

  @override
  ConsumerState<AlumniManagementPage> createState() =>
      _AlumniManagementPageState();
}

class _AlumniManagementPageState
    extends ConsumerState<AlumniManagementPage> {
  final _searchCtrl = TextEditingController();
  String _search = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final alumni = ref.watch(_alumniProvider(_search));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kelola Alumni'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Cari nama, email, atau NIS...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _search = '');
                        },
                      )
                    : null,
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
              onSubmitted: (v) => setState(() => _search = v.trim()),
            ),
          ),
          Expanded(
            child: alumni.when(
              loading: () =>
                  const LoadingView(label: 'Memuat data alumni...'),
              error: (e, _) => ErrorView(
                message: 'Gagal memuat data alumni.',
                onRetry: () => ref.invalidate(_alumniProvider(_search)),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const Center(
                    child: Text(
                      'Tidak ada data alumni',
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(_alumniProvider(_search));
                    await ref.read(_alumniProvider(_search).future);
                  },
                  child: ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 6),
                    itemBuilder: (_, i) => _AlumniTile(
                      alumni: items[i],
                      onDelete: () =>
                          _confirmDelete(context, ref, items[i]),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(
      BuildContext context, WidgetRef ref, AlumniListItem alumni) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Hapus Alumni'),
        content: Text(
            'Hapus alumni "${alumni.name}"? Tindakan ini tidak dapat dibatalkan.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child:
                const Text('Hapus', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      try {
        await ref.read(_adminRepoProvider).deleteAlumni(alumni.id);
        ref.invalidate(_alumniProvider(_search));
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Alumni berhasil dihapus')),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Gagal menghapus: $e')),
          );
        }
      }
    }
  }
}

class _AlumniTile extends StatelessWidget {
  final AlumniListItem alumni;
  final VoidCallback onDelete;

  const _AlumniTile({required this.alumni, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: AppAvatar(
          imageUrl: alumni.avatarUrl,
          name: alumni.name,
          size: 40,
        ),
        title: Text(
          alumni.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (alumni.email != null && alumni.email!.isNotEmpty)
              Text(
                alumni.email!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style:
                    const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            const SizedBox(height: 4),
            Row(
              children: [
                if (alumni.department != null && alumni.department!.isNotEmpty)
                  AppBadge(label: alumni.department!, tone: BadgeTone.navy),
                if (alumni.graduationYear != null) ...[
                  const SizedBox(width: 4),
                  AppBadge(
                    label: "'${alumni.graduationYear.toString().substring(2)}",
                    tone: BadgeTone.slate,
                  ),
                ],
              ],
            ),
            if (alumni.employmentStatus != null &&
                alumni.employmentStatus!.isNotEmpty) ...[
              const SizedBox(height: 4),
              AppBadge(
                label: AppConstants.employmentStatusLabel(alumni.employmentStatus),
                tone: BadgeTone.sky,
              ),
            ],
          ],
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (v) {
            if (v == 'delete') onDelete();
          },
          itemBuilder: (_) => [
            const PopupMenuItem(
              value: 'delete',
              child: Text('Hapus', style: TextStyle(color: AppColors.danger)),
            ),
          ],
        ),
      ),
    );
  }
}
