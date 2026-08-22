import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/networking.dart';
import '../chat/chat_providers.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'networking_providers.dart';

class NetworkingPage extends ConsumerWidget {
  const NetworkingPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chatUnread = ref.watch(chatUnreadCountProvider).valueOrNull ?? 0;
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Jejaring Alumni'),
          actions: [
            Stack(
              alignment: Alignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.chat_bubble_outline_rounded),
                  tooltip: 'Pesan',
                  onPressed: () => context.push('/chat'),
                ),
                if (chatUnread > 0)
                  Positioned(
                    top: 7,
                    right: 7,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      constraints: const BoxConstraints(minWidth: 17, minHeight: 17),
                      decoration: BoxDecoration(
                        color: AppColors.danger,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: Colors.white, width: 1.5),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        chatUnread > 99 ? '99+' : '$chatUnread',
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          height: 1.2,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
          bottom: const TabBar(
            labelColor: AppColors.primary,
            indicatorColor: AppColors.primary,
            unselectedLabelColor: AppColors.textMuted,
            tabs: [
              Tab(text: 'Direktori'),
              Tab(text: 'Koneksi'),
              Tab(text: 'Permintaan'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _DirectoryTab(),
            _ConnectionsTab(),
            _RequestsTab(),
          ],
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------------
// Tab Direktori
// ----------------------------------------------------------------------
class _DirectoryTab extends ConsumerStatefulWidget {
  const _DirectoryTab();

  @override
  ConsumerState<_DirectoryTab> createState() => _DirectoryTabState();
}

class _DirectoryTabState extends ConsumerState<_DirectoryTab> {
  final _searchController = TextEditingController();
  String _search = '';
  int _page = 1;
  bool _loadingMore = false;
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  void _loadMore() {
    final query = (search: _search, page: _page);
    final current = ref.read(directoryProvider(query));
    if (_loadingMore || current.valueOrNull == null || !current.valueOrNull!.hasMore) {
      return;
    }
    setState(() {
      _loadingMore = true;
      _page++;
    });
    ref.read(directoryProvider((search: _search, page: _page)).future).then((_) {
      if (mounted) setState(() => _loadingMore = false);
    }).catchError((_) {
      if (mounted) setState(() => _loadingMore = false);
    });
  }

  void _applySearch(String value) {
    setState(() {
      _search = value.trim();
      _page = 1;
    });
    ref.invalidate(directoryProvider((search: _search, page: _page)));
  }

  void _refresh() {
    ref.invalidate(directoryProvider((search: _search, page: _page)));
  }

  @override
  Widget build(BuildContext context) {
    final query = (search: _search, page: _page);
    final directory = ref.watch(directoryProvider(query));

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            controller: _searchController,
            textInputAction: TextInputAction.search,
            onSubmitted: _applySearch,
            decoration: InputDecoration(
              hintText: 'Cari nama alumni, perusahaan, jabatan…',
              prefixIcon: const Icon(Icons.search_rounded, size: 20),
              isDense: true,
              suffixIcon: _search.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.close_rounded, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        _applySearch('');
                      },
                    )
                  : null,
            ),
          ),
        ),
        Expanded(
          child: directory.when(
            loading: () => const LoadingView(label: 'Memuat direktori…'),
            error: (e, _) => ErrorView(
              message: 'Gagal memuat direktori alumni.',
              onRetry: _refresh,
            ),
            data: (page) {
              if (page.items.isEmpty) {
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(directoryProvider(query));
                    await ref.read(directoryProvider(query).future);
                  },
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: const [
                      SizedBox(height: 100),
                      EmptyView(
                        title: 'Direktori kosong',
                        description:
                            'Alumni satu institusi dengan akun aktif akan muncul di sini.',
                        icon: Icons.people_outline_rounded,
                      ),
                    ],
                  ),
                );
              }
              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(directoryProvider(query));
                  await ref.read(directoryProvider(query).future);
                },
                child: ListView.separated(
                  controller: _scrollController,
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                  itemCount: page.items.length + (_loadingMore ? 1 : 0),
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    if (index >= page.items.length) {
                      return const Padding(
                        padding: EdgeInsets.all(12),
                        child: Center(
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          ),
                        ),
                      );
                    }
                    return _DirectoryCard(
                      alumni: page.items[index],
                      onRefresh: _refresh,
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _DirectoryCard extends ConsumerWidget {
  final NetworkingAlumni alumni;
  final VoidCallback onRefresh;

  const _DirectoryCard({required this.alumni, required this.onRefresh});

  Future<void> _connect(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(networkingRepositoryProvider).sendConnection(alumni.userId);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Permintaan koneksi terkirim')),
      );
      onRefresh();
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengirim permintaan koneksi')),
      );
    }
  }

  Future<void> _accept(BuildContext context, WidgetRef ref, String connectionId) async {
    try {
      await ref.read(networkingRepositoryProvider).acceptConnection(connectionId);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Koneksi berhasil dibuat')),
      );
      onRefresh();
      ref.invalidate(connectionsProvider);
      ref.invalidate(requestsProvider);
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal menerima permintaan')),
      );
    }
  }

  Future<void> _cancelPending(
      BuildContext context, WidgetRef ref, String connectionId) async {
    try {
      await ref.read(networkingRepositoryProvider).removeConnection(connectionId);
      if (!context.mounted) return;
      onRefresh();
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal membatalkan permintaan')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = alumni.connection.status;
    final connectionId = alumni.connection.connectionId;

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => context.push('/network-alumni/${alumni.id}'),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            AppAvatar(imageUrl: alumni.avatarUrl, name: alumni.name, size: 46),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    alumni.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    [
                      alumni.department ?? '',
                      alumni.graduationYear != null
                          ? "'${(alumni.graduationYear! % 100).toString().padLeft(2, '0')}"
                          : '',
                    ].where((e) => e.isNotEmpty).join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
                  ),
                  const SizedBox(height: 4),
                  ..._careerLines(alumni.employmentStatus, alumni: alumni)
                      .map(
                        (line) => Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Text(
                            line,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                          ),
                        ),
                      ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            _connectionAction(context, ref, status, connectionId),
          ],
        ),
      ),
    );
  }

  Widget _connectionAction(
      BuildContext context, WidgetRef ref, String status, String? connectionId) {
    switch (status) {
      case 'connected':
        return const AppBadge(label: 'Terhubung', tone: BadgeTone.green, icon: Icons.check_rounded);
      case 'pending_outgoing':
        return InkWell(
          onTap: connectionId == null
              ? null
              : () => _cancelPending(context, ref, connectionId),
          child: const AppBadge(
            label: 'Menunggu',
            tone: BadgeTone.amber,
            icon: Icons.hourglass_top_rounded,
          ),
        );
      case 'pending_incoming':
        return connectionId == null
            ? const AppBadge(label: 'Menunggu Anda', tone: BadgeTone.violet)
            : FilledButton(
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                ),
                onPressed: () => _accept(context, ref, connectionId),
                child: const Text('Terima'),
              );
      default:
        return OutlinedButton(
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
          ),
          onPressed: () => _connect(context, ref),
          child: const Text('Terhubung'),
        );
    }
  }
}

// ----------------------------------------------------------------------
// Tab Koneksi
// ----------------------------------------------------------------------
class _ConnectionsTab extends ConsumerWidget {
  const _ConnectionsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connections = ref.watch(connectionsProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(connectionsProvider);
        await ref.read(connectionsProvider.future);
      },
      child: connections.when(
        loading: () => const LoadingView(label: 'Memuat koneksi…'),
        error: (e, _) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 120),
            ErrorView(message: 'Gagal memuat koneksi.'),
          ],
        ),
        data: (items) {
          if (items.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 120),
                EmptyView(
                  title: 'Belum ada koneksi',
                  description:
                      'Kirim permintaan koneksi lewat tab Direktori untuk mulai terhubung.',
                  icon: Icons.link_off_rounded,
                ),
              ],
            );
          }
          return ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) => _ConnectionRow(
              item: items[index],
              showActions: true,
            ),
          );
        },
      ),
    );
  }
}

// ----------------------------------------------------------------------
// Tab Permintaan
// ----------------------------------------------------------------------
class _RequestsTab extends ConsumerWidget {
  const _RequestsTab();

  Future<void> _act(
    BuildContext context,
    WidgetRef ref,
    ConnectionItem item, {
    required bool accept,
  }) async {
    try {
      final repo = ref.read(networkingRepositoryProvider);
      if (accept) {
        await repo.acceptConnection(item.id);
      } else {
        await repo.rejectConnection(item.id);
      }
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(accept ? 'Koneksi berhasil dibuat' : 'Permintaan ditolak')),
      );
      ref.invalidate(requestsProvider);
      ref.invalidate(connectionsProvider);
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal memproses permintaan')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requests = ref.watch(requestsProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(requestsProvider);
        await ref.read(requestsProvider.future);
      },
      child: requests.when(
        loading: () => const LoadingView(label: 'Memuat permintaan…'),
        error: (e, _) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 120),
            ErrorView(message: 'Gagal memuat permintaan.'),
          ],
        ),
        data: (items) {
          if (items.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 120),
                EmptyView(
                  title: 'Tidak ada permintaan',
                  description: 'Permintaan koneksi masuk akan muncul di sini.',
                  icon: Icons.person_add_alt_1_outlined,
                ),
              ],
            );
          }
          return ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) => _ConnectionRow(
              item: items[index],
              showActions: false,
              onAccept: () => _act(context, ref, items[index], accept: true),
              onReject: () => _act(context, ref, items[index], accept: false),
            ),
          );
        },
      ),
    );
  }
}

// ----------------------------------------------------------------------
// Row koneksi/permintaan
// ----------------------------------------------------------------------
class _ConnectionRow extends StatelessWidget {
  final ConnectionItem item;
  final bool showActions;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;

  const _ConnectionRow({
    required this.item,
    this.showActions = false,
    this.onAccept,
    this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Row(
            children: [
              AppAvatar(imageUrl: item.userAvatarUrl, name: item.userName, size: 44),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.userName ?? 'Alumni',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [
                        item.department ?? '',
                        item.graduationYear != null ? '${item.graduationYear}' : '',
                      ].where((e) => e.isNotEmpty).join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                    ..._careerLines(item.employmentStatus, item: item)
                        .map(
                          (line) => Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(
                              line,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: AppColors.textMuted, fontSize: 11.5),
                            ),
                          ),
                        ),
                  ],
                ),
              ),
              if (showActions)
                _RemoveButton(connectionId: item.id)
              else
                AppBadge(
                  label: item.isIncoming ? 'Masuk' : 'Keluar',
                  tone: item.isIncoming ? BadgeTone.violet : BadgeTone.slate,
                ),
            ],
          ),
          if (!showActions) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onReject,
                    child: const Text('Tolak'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: onAccept,
                    child: const Text('Terima'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// Baris detail karir (baris utama, bidang usaha, lokasi kerja/usaha) sesuai status.
List<String> _careerLines(
  String? status, {
  NetworkingAlumni? alumni,
  ConnectionItem? item,
}) {
  final a = alumni;
  final i = item;
  final lines = <String>[];

  String? careerLine;
  String? fieldLine;
  String? locationLine;

  switch (status) {
    case 'working':
      careerLine = [
        a?.position ?? i?.position,
        a?.companyName ?? i?.companyName,
      ].where((e) => e != null && e.isNotEmpty).join(' di ');
      fieldLine = a?.businessField ?? i?.businessField;
      locationLine = [
        a?.workCity ?? i?.workCity,
        a?.workProvince ?? i?.workProvince,
      ].where((e) => e != null && e.isNotEmpty).join(', ');
    case 'continuing_study':
      careerLine = [
        a?.studyProgram ?? i?.studyProgram,
        a?.studyInstitution ?? i?.studyInstitution,
      ].where((e) => e != null && e.isNotEmpty).join(' · ');
    case 'entrepreneur':
      careerLine = a?.businessName ?? i?.businessName;
      fieldLine = a?.businessField ?? i?.businessField;
      locationLine = [
        a?.businessCity ?? i?.businessCity,
        a?.businessProvince ?? i?.businessProvince,
      ].where((e) => e != null && e.isNotEmpty).join(', ');
  }

  if (careerLine != null && careerLine.isNotEmpty) lines.add(careerLine);
  if (fieldLine != null && fieldLine.isNotEmpty) lines.add(fieldLine);
  if (locationLine != null && locationLine.isNotEmpty) lines.add(locationLine);
  return lines;
}

class _RemoveButton extends ConsumerWidget {
  final String connectionId;

  const _RemoveButton({required this.connectionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return TextButton.icon(
      onPressed: () async {
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Putuskan Koneksi?'),
            content: const Text(
              'Koneksi akan dihapus. Anda dapat mengirim permintaan baru nanti.',
              style: TextStyle(fontSize: 14),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Batal'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Putuskan'),
              ),
            ],
          ),
        );
        if (confirmed != true || !context.mounted) return;
        try {
          await ref.read(networkingRepositoryProvider).removeConnection(connectionId);
          ref.invalidate(connectionsProvider);
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Koneksi dihapus')),
            );
          }
        } catch (_) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Gagal menghapus koneksi')),
            );
          }
        }
      },
      style: TextButton.styleFrom(foregroundColor: AppColors.danger),
      icon: const Icon(Icons.link_off_rounded, size: 16),
      label: const Text('Putuskan'),
    );
  }
}
