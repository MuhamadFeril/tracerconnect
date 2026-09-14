import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/job_application.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../auth/auth_controller.dart';
import '../chat/chat_providers.dart';
import 'hrd_dashboard_providers.dart';

class HrdDashboardPage extends ConsumerWidget {
  const HrdDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dash = ref.watch(hrdDashboardProvider);
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;
    final unreadChat = ref.watch(chatUnreadCountProvider).valueOrNull ?? 0;

    return dash.when(
      loading: () => const LoadingView(label: 'Memuat dashboard…'),
      error: (e, _) => ErrorView(
        message: 'Gagal memuat dashboard HRD.',
        onRetry: () => ref.invalidate(hrdDashboardProvider),
      ),
      data: (data) => RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(hrdDashboardProvider);
          await ref.read(hrdDashboardProvider.future);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          children: [
            // ── Gradient Header ──
            _DashboardHeader(user: user, unreadChat: unreadChat),
            const SizedBox(height: 20),

            // ── Stat Cards ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _StatCardsRow(data: data),
            ),
            const SizedBox(height: 20),

            // ── Selection Stages ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _SelectionStagesCard(applications: data.applications),
            ),
            const SizedBox(height: 20),

            // ── Quick Actions ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _QuickActionsSection(data: data),
            ),
            const SizedBox(height: 20),

            // ── Recent Applications ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _RecentApplicationsSection(applications: data.recentApplications),
            ),
            const SizedBox(height: 20),

            // ── My Vacancies ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _MyVacanciesSection(vacancies: data.myVacancies),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

// ─── Dashboard Header ────────────────────────────────────────────────────────

class _DashboardHeader extends StatelessWidget {
  final dynamic user;
  final int unreadChat;
  const _DashboardHeader({required this.user, required this.unreadChat});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 28),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primary, AppColors.primaryDark],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                AppAvatar(
                  imageUrl: user?.avatarUrl,
                  name: user?.name ?? 'HRD',
                  size: 40,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Halo, ${user?.name ?? 'HRD'} 👋',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Kelola lowongan & pelamar',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                _HeaderIconBadge(
                  icon: Icons.notifications_none_rounded,
                  onTap: () => context.push('/notifications'),
                ),
                const SizedBox(width: 8),
                _HeaderIconBadge(
                  icon: Icons.chat_bubble_outline_rounded,
                  badgeCount: unreadChat,
                  onTap: () => context.push('/chat'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Search bar
            InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => context.go('/jobs'),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.12),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.search_rounded, color: AppColors.textMuted, size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Cari lowongan, pelamar, atau alumni…',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: AppColors.textMuted.withValues(alpha: 0.9),
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeaderIconBadge extends StatelessWidget {
  final IconData icon;
  final int badgeCount;
  final VoidCallback onTap;
  const _HeaderIconBadge({
    required this.icon,
    this.badgeCount = 0,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 20, color: Colors.white),
          ),
          if (badgeCount > 0)
            Positioned(
              right: -2,
              top: -2,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                decoration: BoxDecoration(
                  color: AppColors.danger,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: AppColors.primary, width: 1.5),
                ),
                child: Text(
                  badgeCount > 9 ? '9+' : '$badgeCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Stat Cards ──────────────────────────────────────────────────────────────

class _StatCardsRow extends StatelessWidget {
  final HrdDashboardData data;
  const _StatCardsRow({required this.data});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _GradientStatCard(
            label: 'Lowongan Aktif',
            value: '${data.vacancies.published}',
            sub: '${data.vacancies.total} total',
            icon: Icons.work_outline_rounded,
            gradient: const [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _GradientStatCard(
            label: 'Total Pelamar',
            value: '${data.applications.total}',
            sub: '${data.applications.rejected} ditolak',
            icon: Icons.inbox_outlined,
            gradient: const [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
          ),
        ),
      ],
    );
  }
}

class _GradientStatCard extends StatelessWidget {
  final String label;
  final String value;
  final String sub;
  final IconData icon;
  final List<Color> gradient;

  const _GradientStatCard({
    required this.label,
    required this.value,
    required this.sub,
    required this.icon,
    required this.gradient,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: gradient,
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: gradient.last.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 19, color: Colors.white),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 1),
          Text(
            sub,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.6),
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Selection Stages ────────────────────────────────────────────────────────

class _SelectionStagesCard extends StatelessWidget {
  final ApplicationStats applications;
  const _SelectionStagesCard({required this.applications});

  @override
  Widget build(BuildContext context) {
    final stages = [
      ('Diajukan', applications.newCount, const Color(0xFF94A3B8)),
      ('Direview', applications.reviewing, const Color(0xFF3B82F6)),
      ('Shortlisted', applications.shortlisted, AppColors.primary),
      ('Interview', applications.interview, const Color(0xFF8B5CF6)),
      ('Diterima', applications.accepted, const Color(0xFF10B981)),
      ('Ditolak', applications.rejected, const Color(0xFFEF4444)),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.filter_list_rounded, size: 18, color: AppColors.textSecondary),
              SizedBox(width: 8),
              Text(
                'Tahap Seleksi',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...stages.map((stage) {
            final (label, count, color) = stage;
            final total = applications.total;
            final pct = total > 0 ? count / total : 0.0;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          label,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '$count',
                          style: TextStyle(
                            color: color,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: LinearProgressIndicator(
                      value: pct,
                      minHeight: 5,
                      backgroundColor: AppColors.border,
                      valueColor: AlwaysStoppedAnimation<Color>(color),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }
}

// ─── Quick Actions ───────────────────────────────────────────────────────────

class _QuickActionsSection extends StatelessWidget {
  final HrdDashboardData data;
  const _QuickActionsSection({required this.data});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.flash_on_rounded, size: 18, color: AppColors.textSecondary),
            SizedBox(width: 8),
            Text(
              'Aksi Cepat',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _ActionCard(
                icon: Icons.add_circle_outline_rounded,
                title: 'Buat Lowongan',
                subtitle: 'Sebarkan ke alumni',
                gradient: const [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                onTap: () => context.push('/hrd-jobs/new'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ActionCard(
                icon: Icons.manage_accounts_outlined,
                title: 'Kelola Lowongan',
                subtitle: '${data.vacancies.total} lowongan',
                gradient: const [Color(0xFF10B981), Color(0xFF059669)],
                onTap: () => context.push('/hrd-jobs'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _ActionCard(
                icon: Icons.chat_bubble_outline_rounded,
                title: 'Chat Alumni',
                subtitle: 'Mulai percakapan',
                gradient: const [Color(0xFFF59E0B), Color(0xFFD97706)],
                onTap: () => context.push('/chat'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ActionCard(
                icon: Icons.how_to_reg_outlined,
                title: 'Pelamar',
                subtitle: '${data.applications.total} total',
                gradient: const [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
                onTap: () => context.push('/hrd-jobs'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final List<Color> gradient;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.gradient,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: gradient,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: gradient.last.withValues(alpha: 0.25),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 24, color: Colors.white),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Recent Applications ─────────────────────────────────────────────────────

class _RecentApplicationsSection extends StatelessWidget {
  final List<JobApplication> applications;
  const _RecentApplicationsSection({required this.applications});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.mail_outline_rounded, size: 18, color: AppColors.textSecondary),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'Lamaran Terbaru',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            GestureDetector(
              onTap: () => context.push('/hrd-jobs'),
              child: const Text(
                'Lihat semua',
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (applications.isEmpty)
          _EmptyState(
            icon: Icons.mail_outline_rounded,
            message: 'Belum ada pelamar',
          )
        else
          ...applications.take(5).map((app) => _ApplicationTile(application: app)),
      ],
    );
  }
}

class _ApplicationTile extends StatelessWidget {
  final JobApplication application;
  const _ApplicationTile({required this.application});

  @override
  Widget build(BuildContext context) {
    final name = application.vacancy?.title ?? 'Alumni';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: AppAvatar(
          imageUrl: null,
          name: name,
          size: 40,
        ),
        title: Text(
          name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          application.vacancy?.title ?? '—',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: AppColors.textMuted,
            fontSize: 12,
          ),
        ),
        trailing: _StatusBadge(status: application.status),
      ),
    );
  }
}

// ─── My Vacancies ────────────────────────────────────────────────────────────

class _MyVacanciesSection extends StatelessWidget {
  final List<dynamic> vacancies;
  const _MyVacanciesSection({required this.vacancies});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.work_outline_rounded, size: 18, color: AppColors.textSecondary),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'Lowongan Saya',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            GestureDetector(
              onTap: () => context.push('/hrd-jobs'),
              child: const Text(
                'Lihat semua',
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (vacancies.isEmpty)
          _EmptyState(
            icon: Icons.work_off_outlined,
            message: 'Belum ada lowongan',
          )
        else
          ...vacancies.take(5).map((job) => _VacancyTile(job: job)),
      ],
    );
  }
}

class _VacancyTile extends StatelessWidget {
  final dynamic job;
  const _VacancyTile({required this.job});

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
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.primaryLight,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.business_center_outlined, color: AppColors.primary, size: 20),
        ),
        title: Text(
          job.title ?? '—',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          [
            job.companyName ?? '',
            if (job.location != null && job.location!.isNotEmpty) job.location!,
          ].where((e) => e.isNotEmpty).join(' · '),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.people_outline_rounded, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 4),
              Text(
                '${job.applicantsCount ?? 0}',
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Status Badge ────────────────────────────────────────────────────────────

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, tone) = switch (status) {
      'submitted' => ('Diajukan', BadgeTone.slate),
      'reviewing' => ('Direview', BadgeTone.sky),
      'shortlisted' => ('Shortlisted', BadgeTone.navy),
      'interview' => ('Interview', BadgeTone.violet),
      'accepted' => ('Diterima', BadgeTone.green),
      'rejected' => ('Ditolak', BadgeTone.red),
      _ => (status, BadgeTone.slate),
    };
    return AppBadge(label: label, tone: tone);
  }
}

// ─── Empty State ─────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  const _EmptyState({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Center(
        child: Column(
          children: [
            Icon(icon, size: 28, color: AppColors.textMuted),
            const SizedBox(height: 8),
            Text(
              message,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
