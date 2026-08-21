import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/networking.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../networking/networking_repository.dart';

class BlockedUsersPage extends ConsumerStatefulWidget {
  const BlockedUsersPage({super.key});

  @override
  ConsumerState<BlockedUsersPage> createState() => _BlockedUsersPageState();
}

class _BlockedUsersPageState extends ConsumerState<BlockedUsersPage> {
  late Future<List<BlockedUserItem>> _future;

  @override
  void initState() {
    super.initState();
    _future = NetworkingRepository().blocked();
  }

  void _reload() {
    setState(() {
      _future = NetworkingRepository().blocked();
    });
  }

  Future<void> _unblock(BlockedUserItem item) async {
    try {
      await NetworkingRepository().unblock(item.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pengguna berhasil dibuka blokirnya')),
      );
      _reload();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal membuka blokir')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pengguna Diblokir')),
      body: FutureBuilder<List<BlockedUserItem>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const LoadingView(label: 'Memuat…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Gagal memuat daftar pengguna diblokir.',
              onRetry: _reload,
            );
          }
          final items = snapshot.data ?? const [];
          if (items.isEmpty) {
            return const EmptyView(
              title: 'Tidak ada pengguna diblokir',
              description: 'Pengguna yang Anda blokir akan muncul di sini.',
              icon: Icons.block_rounded,
            );
          }
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final item = items[index];
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      AppAvatar(imageUrl: item.avatarUrl, name: item.name, size: 42),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          item.name ?? 'Pengguna',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () => _unblock(item),
                        icon: const Icon(Icons.lock_open_outlined, size: 16),
                        label: const Text('Buka Blokir'),
                      ),
                    ],
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
