import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../models/networking.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'networking_providers.dart';
import '../chat/chat_providers.dart';

class AlumniDetailPage extends ConsumerWidget {
  final String id;

  const AlumniDetailPage({super.key, required this.id});

  Future<void> _chat(BuildContext context, WidgetRef ref, NetworkingAlumni alumni) async {
    try {
      final conversation =
          await ref.read(chatRepositoryProvider).start(userId: alumni.userId);
      if (!context.mounted) return;
      ref.invalidate(conversationsProvider);
      context.push('/chat/${conversation.id}');
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal memulai percakapan')),
      );
    }
  }

  Future<void> _connect(BuildContext context, WidgetRef ref, NetworkingAlumni alumni) async {
    try {
      await ref.read(networkingRepositoryProvider).sendConnection(alumni.userId);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Permintaan koneksi terkirim')),
      );
      ref.invalidate(alumniDetailProvider(id));
      ref.invalidate(directoryProvider((search: '', page: 1)));
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengirim permintaan koneksi')),
      );
    }
  }

  Future<void> _cancelPending(BuildContext context, WidgetRef ref, String? connectionId) async {
    if (connectionId == null) return;
    try {
      await ref.read(networkingRepositoryProvider).removeConnection(connectionId);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Permintaan koneksi dibatalkan')),
      );
      ref.invalidate(alumniDetailProvider(id));
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal membatalkan permintaan')),
      );
    }
  }

  Future<void> _removeConnection(BuildContext context, WidgetRef ref, String? connectionId) async {
    if (connectionId == null) return;
    try {
      await ref.read(networkingRepositoryProvider).removeConnection(connectionId);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Koneksi dihapus')),
      );
      ref.invalidate(alumniDetailProvider(id));
      ref.invalidate(connectionsProvider);
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal menghapus koneksi')),
      );
    }
  }

  Future<void> _block(BuildContext context, WidgetRef ref, String userId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Blokir Pengguna?'),
        content: const Text(
          'Pengguna ini tidak akan bisa melihat Anda dan koneksi akan dihapus.',
          style: TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Blokir'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await ref.read(networkingRepositoryProvider).block(userId);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pengguna diblokir')),
      );
      Navigator.of(context).pop();
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal memblokir pengguna')),
      );
    }
  }

  Future<void> _report(BuildContext context, WidgetRef ref, String userId) async {
    final details = TextEditingController();
    String selectedReason = 'spam';

    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Laporkan Pengguna'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DropdownButtonFormField<String>(
                initialValue: selectedReason,
                decoration: const InputDecoration(labelText: 'Alasan'),
                items: const [
                  DropdownMenuItem(value: 'spam', child: Text('Spam / Promosi')),
                  DropdownMenuItem(
                      value: 'abuse', child: Text('Pelecehan / Konten tidak pantas')),
                  DropdownMenuItem(value: 'fake', child: Text('Profil palsu')),
                  DropdownMenuItem(value: 'other', child: Text('Lainnya')),
                ],
                onChanged: (v) => setDialogState(() => selectedReason = v ?? 'spam'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: details,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Detail (opsional)',
                  alignLabelWithHint: true,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Batal'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop({
                'reason': selectedReason,
                'details': details.text,
              }),
              child: const Text('Kirim Laporan'),
            ),
          ],
        ),
      ),
    );
    details.dispose();

    if (result == null || !context.mounted) return;
    try {
      await ref.read(networkingRepositoryProvider).report(
            reportedId: userId,
            reason: result['reason'] ?? 'spam',
            details: result['details'],
          );
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Laporan berhasil dikirim')),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengirim laporan')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alumni = ref.watch(alumniDetailProvider(id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil Alumni'),
        actions: [
          alumni.maybeWhen(
            data: (a) => PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert_rounded),
              onSelected: (value) {
                switch (value) {
                  case 'block':
                    _block(context, ref, a.userId);
                    break;
                  case 'report':
                    _report(context, ref, a.userId);
                    break;
                }
              },
              itemBuilder: (context) => const [
                PopupMenuItem(
                  value: 'block',
                  child: Row(
                    children: [
                      Icon(Icons.block_rounded, color: AppColors.danger, size: 18),
                      SizedBox(width: 8),
                      Text('Blokir Pengguna'),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'report',
                  child: Row(
                    children: [
                      Icon(Icons.flag_outlined, color: AppColors.danger, size: 18),
                      SizedBox(width: 8),
                      Text('Laporkan'),
                    ],
                  ),
                ),
              ],
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: alumni.when(
        loading: () => const LoadingView(label: 'Memuat profil…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat profil alumni.',
          onRetry: () => ref.invalidate(alumniDetailProvider(id)),
        ),
        data: (a) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                children: [
                  AppAvatar(imageUrl: a.avatarUrl, name: a.name, size: 72),
                  const SizedBox(height: 12),
                  Text(
                    a.name,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    [
                      a.department ?? '',
                      a.graduationYear != null ? 'Angkatan ${a.graduationYear}' : '',
                    ].where((e) => e.isNotEmpty).join(' · '),
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Color(0xFFCBD5F5), fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    alignment: WrapAlignment.center,
                    children: [
                      AppBadge(
                        label: AppConstants.employmentStatusLabel(a.employmentStatus),
                        tone: _statusTone(a.employmentStatus),
                      ),
                      AppBadge(
                        label: AppConstants.connectionStatusLabel(a.connection.status),
                        tone: a.connection.status == 'connected'
                            ? BadgeTone.green
                            : BadgeTone.slate,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (_hasCareerDetail(a)) ...[
              _DetailCard(
                children: [
                  ..._careerDetailRows(a),
                ],
              ),
              const SizedBox(height: 16),
            ],
            _actionButton(context, ref, a),
          ],
        ),
      ),
    );
  }

  Widget _actionButton(BuildContext context, WidgetRef ref, NetworkingAlumni alumni) {
    final status = alumni.connection.status;
    final connectionId = alumni.connection.connectionId;

    switch (status) {
      case 'connected':
        return Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: () => _chat(context, ref, alumni),
                icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                label: const Text('Kirim Pesan'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.danger,
                  side: const BorderSide(color: AppColors.danger),
                ),
                onPressed: () => _removeConnection(context, ref, connectionId),
                icon: const Icon(Icons.link_off_rounded, size: 18),
                label: const Text('Putuskan'),
              ),
            ),
          ],
        );
      case 'pending_outgoing':
        return OutlinedButton.icon(
          onPressed: () => _cancelPending(context, ref, connectionId),
          icon: const Icon(Icons.close_rounded, size: 18),
          label: const Text('Batalkan Permintaan'),
        );
      case 'pending_incoming':
        return FilledButton.icon(
          onPressed: () async {
            if (connectionId == null) return;
            try {
              await ref.read(networkingRepositoryProvider).acceptConnection(connectionId);
              ref.invalidate(alumniDetailProvider(id));
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Koneksi berhasil dibuat')),
                );
              }
            } catch (_) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Gagal menerima permintaan')),
                );
              }
            }
          },
          icon: const Icon(Icons.person_add_alt_1_rounded, size: 18),
          label: const Text('Terima Permintaan'),
        );
      default:
        return FilledButton.icon(
          onPressed: () => _connect(context, ref, alumni),
          icon: const Icon(Icons.person_add_alt_1_rounded, size: 18),
          label: const Text('Kirim Permintaan Koneksi'),
        );
    }
  }

  bool _hasCareerDetail(NetworkingAlumni a) {
    return a.position != null ||
        a.companyName != null ||
        a.businessField != null ||
        a.businessStartYear != null ||
        a.workProvince != null ||
        a.workCity != null ||
        a.studyInstitution != null ||
        a.studyProgram != null ||
        a.studyEntryYear != null ||
        a.businessName != null ||
        a.businessAddress != null ||
        a.businessProvince != null ||
        a.businessCity != null ||
        a.location != null;
  }

  List<Widget> _careerDetailRows(NetworkingAlumni a) {
    switch (a.employmentStatus) {
      case 'working':
        return [
          if (a.position != null && a.position!.isNotEmpty)
            _DetailRow(icon: Icons.badge_outlined, label: 'Jabatan', value: a.position!),
          if (a.companyName != null && a.companyName!.isNotEmpty)
            _DetailRow(icon: Icons.business_center_outlined, label: 'Perusahaan', value: a.companyName!),
          if (a.businessField != null && a.businessField!.isNotEmpty)
            _DetailRow(icon: Icons.category_outlined, label: 'Bidang', value: a.businessField!),
          if (a.workProvince != null || a.workCity != null)
            _DetailRow(
              icon: Icons.place_outlined,
              label: 'Lokasi Kerja',
              value: [a.workCity, a.workProvince].where((e) => e != null && e.isNotEmpty).join(', '),
            ),
          if (a.location != null && a.location!.isNotEmpty)
            _DetailRow(icon: Icons.map_outlined, label: 'Alamat', value: a.location!),
        ];
      case 'continuing_study':
        return [
          if (a.studyInstitution != null && a.studyInstitution!.isNotEmpty)
            _DetailRow(icon: Icons.school_outlined, label: 'Kuliah di', value: a.studyInstitution!),
          if (a.studyProgram != null && a.studyProgram!.isNotEmpty)
            _DetailRow(icon: Icons.menu_book_outlined, label: 'Prodi', value: a.studyProgram!),
          if (a.studyEntryYear != null)
            _DetailRow(
              icon: Icons.event_outlined,
              label: 'Masuk',
              value: '${a.studyEntryYear}',
            ),
        ];
      case 'entrepreneur':
        return [
          if (a.businessName != null && a.businessName!.isNotEmpty)
            _DetailRow(icon: Icons.storefront_outlined, label: 'Nama Usaha', value: a.businessName!),
          if (a.businessField != null && a.businessField!.isNotEmpty)
            _DetailRow(icon: Icons.category_outlined, label: 'Bidang', value: a.businessField!),
          if (a.businessStartYear != null)
            _DetailRow(
              icon: Icons.event_outlined,
              label: 'Sejak',
              value: '${a.businessStartYear}',
            ),
          if (a.businessProvince != null || a.businessCity != null)
            _DetailRow(
              icon: Icons.place_outlined,
              label: 'Lokasi Usaha',
              value: [a.businessCity, a.businessProvince].where((e) => e != null && e.isNotEmpty).join(', '),
            ),
          if (a.businessAddress != null && a.businessAddress!.isNotEmpty)
            _DetailRow(icon: Icons.map_outlined, label: 'Alamat', value: a.businessAddress!),
        ];
      default:
        return [
          if (a.location != null && a.location!.isNotEmpty)
            _DetailRow(icon: Icons.place_outlined, label: 'Lokasi', value: a.location!),
        ];
    }
  }

  BadgeTone _statusTone(String? status) {
    switch (status) {
      case 'working':
      case 'entrepreneur':
        return BadgeTone.green;
      case 'continuing_study':
        return BadgeTone.sky;
      case 'unemployed':
        return BadgeTone.amber;
      default:
        return BadgeTone.slate;
    }
  }
}

class _DetailCard extends StatelessWidget {
  final List<Widget> children;

  const _DetailCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(children: children),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 19, color: AppColors.primary),
          const SizedBox(width: 12),
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
