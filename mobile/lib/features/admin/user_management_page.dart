import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/role_utils.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'admin_repository.dart';
import 'admin_models.dart';

final _adminRepoProvider = Provider((_) => AdminRepository());

final _usersProvider = FutureProvider.autoDispose.family<List<UserListItem>, ({String search, String role})>(
  (ref, params) async {
    final repo = ref.read(_adminRepoProvider);
    final result = await repo.listUsers(
      search: params.search.isEmpty ? null : params.search,
      role: params.role.isEmpty ? null : params.role,
    );
    return result.items;
  },
);

class UserManagementPage extends ConsumerStatefulWidget {
  const UserManagementPage({super.key});

  @override
  ConsumerState<UserManagementPage> createState() => _UserManagementPageState();
}

class _UserManagementPageState extends ConsumerState<UserManagementPage> {
  final _searchCtrl = TextEditingController();
  String _search = '';
  String _roleFilter = '';

  static const _roles = ['', 'alumni', 'hrd', 'institution_admin'];

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final users = ref.watch(_usersProvider((search: _search, role: _roleFilter)));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kelola Pengguna'),
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
                hintText: 'Cari nama atau email...',
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
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
              onSubmitted: (v) => setState(() => _search = v.trim()),
            ),
          ),
          // Role filter chips
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: [
                for (final r in _roles)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(r.isEmpty ? 'Semua' : RoleUtils.label(r)),
                      selected: _roleFilter == r,
                      onSelected: (_) => setState(() => _roleFilter = r),
                      selectedColor: AppColors.primaryLight,
                      checkmarkColor: AppColors.primary,
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: users.when(
              loading: () => const LoadingView(label: 'Memuat data pengguna...'),
              error: (e, _) => ErrorView(
                message: 'Gagal memuat data pengguna.',
                onRetry: () => ref.invalidate(_usersProvider((search: _search, role: _roleFilter))),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const Center(
                    child: Text('Tidak ada data pengguna', style: TextStyle(color: AppColors.textMuted)),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 6),
                  itemBuilder: (_, i) => _UserTile(
                    user: items[i],
                    onChangeRole: () => _showRoleDialog(context, ref, items[i]),
                    onDelete: () => _confirmDelete(context, ref, items[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showRoleDialog(BuildContext context, WidgetRef ref, UserListItem user) async {
    final currentRole = user.roles.isNotEmpty ? user.roles.first : 'alumni';
    String selected = currentRole;

    final result = await showDialog<String>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Ubah Role: ${user.name}'),
          content: RadioGroup<String>(
            groupValue: selected,
            onChanged: (v) => setDialogState(() => selected = v!),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final r in ['alumni', 'hrd', 'institution_admin'])
                  RadioListTile<String>(
                    title: Text(RoleUtils.label(r)),
                    value: r,
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
            TextButton(
              onPressed: () => Navigator.pop(ctx, selected),
              child: const Text('Simpan'),
            ),
          ],
        ),
      ),
    );

    if (result != null && result != currentRole) {
      try {
        await ref.read(_adminRepoProvider).updateUserRole(user.id, result);
        ref.invalidate(_usersProvider((search: _search, role: _roleFilter)));
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Role ${user.name} diubah ke ${RoleUtils.label(result)}')),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Gagal mengubah role: $e')),
          );
        }
      }
    }
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref, UserListItem user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Hapus Pengguna'),
        content: Text('Hapus pengguna "${user.name}"? Tindakan ini tidak dapat dibatalkan.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Hapus', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      try {
        await ref.read(_adminRepoProvider).deleteUser(user.id);
        ref.invalidate(_usersProvider((search: _search, role: _roleFilter)));
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Pengguna berhasil dihapus')),
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

class _UserTile extends StatelessWidget {
  final UserListItem user;
  final VoidCallback onChangeRole;
  final VoidCallback onDelete;

  const _UserTile({required this.user, required this.onChangeRole, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final primaryRole = user.roles.isNotEmpty ? user.roles.first : 'alumni';

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: AppAvatar(imageUrl: user.avatarUrl, name: user.name, size: 40),
        title: Text(user.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(user.email, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
            const SizedBox(height: 4),
            AppBadge(label: RoleUtils.label(primaryRole), tone: BadgeTone.sky),
          ],
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (v) {
            if (v == 'role') onChangeRole();
            if (v == 'delete') onDelete();
          },
          itemBuilder: (_) => [
            const PopupMenuItem(value: 'role', child: Text('Ubah Role')),
            const PopupMenuItem(value: 'delete', child: Text('Hapus', style: TextStyle(color: AppColors.danger))),
          ],
        ),
      ),
    );
  }
}
