import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../auth/auth_controller.dart';

class PengaturanPage extends ConsumerWidget {
  const PengaturanPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Pengaturan')),
      body: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          // Profile section
          _SectionHeader(title: 'Profil'),
          _SettingsTile(
            icon: Icons.person_outline_rounded,
            title: 'Edit Profil',
            subtitle: 'Nama, email, data diri',
            route: '/edit-profile',
          ),
          _SettingsTile(
            icon: Icons.lock_outline_rounded,
            title: 'Ubah Password',
            subtitle: 'Ganti password akun Anda',
            route: '/change-password',
          ),
          const SizedBox(height: 20),

          // Security section
          _SectionHeader(title: 'Keamanan'),
          _SettingsTile(
            icon: Icons.block_outlined,
            title: 'Pengguna yang Diblokir',
            subtitle: 'Kelola daftar blokir',
            route: '/blocked-users',
          ),
          const SizedBox(height: 20),

          // About section
          _SectionHeader(title: 'Tentang'),
          _SettingsTile(
            icon: Icons.help_outline_rounded,
            title: 'Pusat Bantuan',
            subtitle: 'FAQ dan panduan',
            route: '/bantuan',
          ),
          _SettingsTile(
            icon: Icons.info_outline_rounded,
            title: 'Tentang TracerAlumni',
            subtitle: 'Versi 1.0.0',
            onTap: () => _showAbout(context),
          ),
          const SizedBox(height: 24),

          // Logout
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () async {
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Keluar?'),
                    content: const Text(
                        'Anda akan keluar dari akun ini. Lanjutkan?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Batal'),
                      ),
                      FilledButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Keluar'),
                      ),
                    ],
                  ),
                );
                if (confirmed == true && context.mounted) {
                  await ref.read(authControllerProvider.notifier).logout();
                }
              },
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.danger),
                foregroundColor: AppColors.danger,
                minimumSize: const Size.fromHeight(48),
              ),
              icon: const Icon(Icons.logout_rounded, size: 20),
              label: const Text('Keluar dari Akun'),
            ),
          ),
          const SizedBox(height: 12),

          // Account info
          if (user != null)
            Center(
              child: Text(
                user.email,
                style: const TextStyle(
                    color: AppColors.textMuted, fontSize: 12),
              ),
            ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  void _showAbout(BuildContext context) {
    showAboutDialog(
      context: context,
      applicationName: 'TracerAlumni',
      applicationVersion: '1.0.0',
      applicationIcon: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.primaryDark, AppColors.primary],
          ),
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Icon(Icons.school_rounded, color: Colors.white, size: 26),
      ),
      children: [
        const Text(
          'Platform tracer study dan alumni engagement untuk institusi pendidikan.',
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          color: AppColors.textMuted,
          fontSize: 12,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? route;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.route,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        onTap: onTap ?? (route != null ? () => context.push(route!) : null),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 20, color: AppColors.textSecondary),
        ),
        title: Text(
          title,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
        ),
        trailing: const Icon(Icons.chevron_right_rounded,
            color: AppColors.textMuted, size: 20),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}
