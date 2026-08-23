import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/role_utils.dart';
import '../../models/user.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_badge.dart';
import '../auth/auth_controller.dart';
import '../auth/auth_repository.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  Future<void> _pickAndUpload(BuildContext context, WidgetRef ref) async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      imageQuality: 80,
    );
    if (file == null) return;
    try {
      final user = await AuthRepository().uploadAvatar(File(file.path));
      ref.read(authControllerProvider.notifier).updateUser(user);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Foto profil berhasil diperbarui')),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengunggah foto profil')),
      );
    }
  }

  Future<void> _deleteAvatar(BuildContext context, WidgetRef ref) async {
    try {
      final user = await AuthRepository().deleteAvatar();
      ref.read(authControllerProvider.notifier).updateUser(user);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Foto profil dihapus')),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal menghapus foto profil')),
      );
    }
  }

  Future<void> _avatarMenu(BuildContext context, WidgetRef ref, User user) async {
    final action = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Unggah dari Galeri'),
              onTap: () => Navigator.of(context).pop('upload'),
            ),
            if (user.avatarUrl != null)
              ListTile(
                leading: const Icon(Icons.delete_outline_rounded,
                    color: AppColors.danger),
                title: const Text('Hapus Foto', style: TextStyle(color: AppColors.danger)),
                onTap: () => Navigator.of(context).pop('delete'),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (!context.mounted || action == null) return;
    if (action == 'upload') {
      await _pickAndUpload(context, ref);
    } else if (action == 'delete') {
      await _deleteAvatar(context, ref);
    }
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Keluar dari Akun?'),
        content: const Text(
          'Anda akan keluar dari TracerConnect. Token login akan dihapus dari perangkat.',
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
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    await ref.read(authControllerProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;
    if (user == null) return const SizedBox.shrink();

    final alumni = user.alumni;
    final phone = alumni?.phone ?? user.phone;
    final birthDate = alumni?.birthDate ?? user.birthDate;
    final birthplace = alumni?.birthplaceLabel ?? alumni?.birthplace ?? user.birthplace;
    final address = alumni?.address ?? user.address;
    final employmentStatus = alumni?.employmentStatus ?? user.alumni?.employmentStatus;

    return Scaffold(
      appBar: AppBar(title: const Text('Profil Saya')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header profil
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
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    AppAvatar(imageUrl: user.avatarUrl, name: user.name, size: 84),
                    Positioned(
                      right: -4,
                      bottom: -4,
                      child: Material(
                        color: AppColors.surface,
                        shape: const CircleBorder(),
                        elevation: 2,
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: () => _avatarMenu(context, ref, user),
                          child: const Padding(
                            padding: EdgeInsets.all(7),
                            child: Icon(Icons.photo_camera_rounded,
                                size: 18, color: AppColors.primary),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  user.name,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  user.email,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFFCBD5F5), fontSize: 13),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  alignment: WrapAlignment.center,
                  children: [
                    for (final role in user.roles)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          role.replaceAll('_', ' ').toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    if (user.institution != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          user.institution!.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Data alumni / akun
          _ProfileCard(
            title: alumni != null ? 'Data Alumni' : 'Data Akun',
            children: [
              if (alumni != null) ...[
                _InfoRow(label: 'NIS/NIM', value: alumni.nisNim),
                if (alumni.nisn != null && alumni.nisn!.isNotEmpty)
                  _InfoRow(label: 'NISN', value: alumni.nisn),
                _InfoRow(label: 'Jurusan', value: alumni.department),
                _InfoRow(
                  label: 'Tahun Lulus',
                  value: alumni.graduationYear?.toString(),
                ),
              ],
              _InfoRow(
                label: 'Status Kerja',
                value: AppConstants.employmentStatusLabel(employmentStatus),
              ),
              _InfoRow(label: 'No. HP', value: phone),
              _InfoRow(
                label: 'Tanggal Lahir',
                value: birthDate == null ? null : Formatters.formatDate(Formatters.parseDate(birthDate)),
              ),
              _InfoRow(label: 'Tempat Lahir', value: birthplace),
              _InfoRow(label: 'Alamat', value: address),
            ],
          ),
          const SizedBox(height: 16),

          if (alumni != null &&
              (alumni.skills.isNotEmpty || alumni.socials.isNotEmpty)) ...[
            _ProfileCard(
              title: 'Keahlian & Jejaring Sosial',
              children: [
                if (alumni.skills.isNotEmpty) ...[
                  const _InfoLabel('Keahlian'),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final skill in alumni.skills)
                        AppBadge(label: skill, tone: BadgeTone.navy),
                    ],
                  ),
                  const SizedBox(height: 10),
                ],
                if (alumni.socials.isNotEmpty) ...[
                  const _InfoLabel('Media Sosial'),
                  for (final social in alumni.socials)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          const Icon(Icons.link_rounded, size: 16, color: AppColors.primary),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              social.url,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontSize: 13,
                                decoration: TextDecoration.underline,
                                decorationColor: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ],
            ),
            const SizedBox(height: 16),
          ],

          // Menu — role-aware.
          _ProfileCard(
            title: 'Menu',
            children: [
              _MenuTile(
                icon: Icons.edit_outlined,
                title: 'Edit Profil',
                onTap: () => context.push('/edit-profile'),
              ),
              _MenuTile(
                icon: Icons.lock_outline_rounded,
                title: 'Ubah Password',
                onTap: () => context.push('/change-password'),
              ),
              // Alumni-only items.
              if (RoleUtils.isAlumni(user)) ...[
                _MenuTile(
                  icon: Icons.assignment_outlined,
                  title: 'Lamaran Saya',
                  onTap: () => context.push('/my-applications'),
                ),
                _MenuTile(
                  icon: Icons.bookmark_outline_rounded,
                  title: 'Lowongan Tersimpan',
                  onTap: () => context.push('/my-bookmarks'),
                ),

              ],
              // Employer-only items.
              if (RoleUtils.isEmployer(user) && !RoleUtils.isAdmin(user)) ...[
                _MenuTile(
                  icon: Icons.work_outline_rounded,
                  title: 'Kelola Lowongan',
                  onTap: () => context.push('/employer-jobs'),
                ),
              ],
              // Admin-only items.
              if (RoleUtils.isAdmin(user)) ...[
                _MenuTile(
                  icon: Icons.analytics_outlined,
                  title: 'Analitik & Dashboard',
                  onTap: () => context.go('/home'),
                ),
                _MenuTile(
                  icon: Icons.campaign_outlined,
                  title: 'Kelola Pengumuman',
                  onTap: () => context.push('/announcements'),
                ),

                _MenuTile(
                  icon: Icons.event_outlined,
                  title: 'Kelola Acara',
                  onTap: () => context.push('/events'),
                ),
              ],
              _MenuTile(
                icon: Icons.block_rounded,
                title: 'Pengguna Diblokir',
                onTap: () => context.push('/blocked-users'),
              ),
              _MenuTile(
                icon: Icons.settings_outlined,
                title: 'Pengaturan',
                onTap: () => context.push('/pengaturan'),
              ),
              _MenuTile(
                icon: Icons.help_outline_rounded,
                title: 'Pusat Bantuan',
                onTap: () => context.push('/bantuan'),
              ),
              _MenuTile(
                icon: Icons.logout_rounded,
                title: 'Keluar',
                destructive: true,
                onTap: () => _confirmLogout(context, ref),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _ProfileCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Text(
              title,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const Divider(),
          ...children,
        ],
      ),
    );
  }
}

class _InfoLabel extends StatelessWidget {
  final String text;
  const _InfoLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 6),
      child: Text(
        text,
        style: const TextStyle(
          color: AppColors.textMuted,
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String? value;

  const _InfoRow({required this.label, this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 108,
            child: Text(
              label,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              (value == null || value!.isEmpty) ? '—' : value!,
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

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final bool destructive;
  final VoidCallback onTap;

  const _MenuTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.destructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = destructive ? AppColors.danger : AppColors.textPrimary;
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Icon(icon, size: 20, color: destructive ? AppColors.danger : AppColors.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: color,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20),
          ],
        ),
      ),
    );
  }
}
