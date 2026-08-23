import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/job_application.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../../shared/widgets/section_header.dart';
import 'employer_dashboard_providers.dart';

class EmployerDashboardPage extends ConsumerWidget {
  const EmployerDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dash = ref.watch(employerDashboardProvider);

    return dash.when(
      loading: () => const LoadingView(label: 'Memuat dashboard…'),
      error: (e, _) => ErrorView(
        message: 'Gagal memuat dashboard employer.',
        onRetry: () => ref.invalidate(employerDashboardProvider),
      ),
      data: (data) => RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(employerDashboardProvider);
          await ref.read(employerDashboardProvider.future);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            // ── Section: Ringkasan ──
            const _SectionTitle(
              icon: Icons.analytics_outlined,
              title: 'Ringkasan',
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    label: 'Lowongan Aktif',
                    value: '${data.vacancies.published}',
                    sub: '${data.vacancies.total} total',
                    icon: Icons.work_outline_rounded,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatCard(
                    label: 'Total Pelamar',
                    value: '${data.applications.total}',
                    sub: '${data.applications.rejected} ditolak',
                    icon: Icons.inbox_outlined,
                    color: AppColors.info,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    label: 'Lamaran Baru',
                    value: '${data.applications.newCount}',
                    sub: 'Menunggu direview',
                    icon: Icons.send_outlined,
                    color: AppColors.warning,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatCard(
                    label: 'Diterima',
                    value: '${data.applications.accepted}',
                    sub: '${data.applications.interview} interview',
                    icon: Icons.person_add_outlined,
                    color: AppColors.success,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // ── Tahap Seleksi ──
            const _SectionTitle(
              icon: Icons.filter_list_rounded,
              title: 'Tahap Seleksi',
            ),
            const SizedBox(height: 10),
            _SelectionStagesCard(applications: data.applications),
            const SizedBox(height: 24),

            // ── Lamaran Terbaru ──
            SectionHeader(
              icon: Icons.mail_outline_rounded,
              title: 'Lamaran Terbaru',
              subtitle: '5 pelamar terakhir',
              action: _SectionAction(
                onTap: () => context.push('/employer-jobs'),
              ),
            ),
            const SizedBox(height: 8),
            if (data.recentApplications.isEmpty)
              _EmptyCard(
                icon: Icons.mail_outline_rounded,
                message: 'Belum ada pelamar',
              )
            else
              ...data.recentApplications.map(
                (app) => _ApplicationTile(
                  application: app,
                  onTap: () => context.push('/employer-jobs'),
                ),
              ),
            const SizedBox(height: 24),

            // ── Aksi Cepat ──
            Row(
              children: [
                Expanded(
                  child: _QuickActionCard(
                    icon: Icons.add_circle_outline_rounded,
                    title: 'Buat Lowongan',
                    subtitle: 'Sebarkan ke alumni',
                    color: AppColors.primary,
                    onTap: () => context.push('/employer-jobs/new'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _QuickActionCard(
                    icon: Icons.manage_accounts_outlined,
                    title: 'Kelola Lowongan',
                    subtitle: '${data.vacancies.total} lowongan',
                    color: AppColors.success,
                    onTap: () => context.push('/employer-jobs'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // ── Lowongan Saya ──
            SectionHeader(
              icon: Icons.work_outline_rounded,
              title: 'Lowongan Saya',
              subtitle: '5 lowongan terakhir',
              action: _SectionAction(
                onTap: () => context.push('/employer-jobs'),
              ),
            ),
            const SizedBox(height: 8),
            if (data.myVacancies.isEmpty)
              _EmptyCard(
                icon: Icons.work_off_outlined,
                message: 'Belum ada lowongan',
              )
            else
              ...data.myVacancies.map(
                (job) => _VacancyTile(
                  job: job,
                  onTap: () =>
                      context.push('/employer-jobs/${job.id}/applicants'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final String sub;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.sub,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 19, color: color),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 1),
          Text(
            sub,
            style: const TextStyle(
              color: AppColors.textMuted,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Selection Stages ───────────────────────────────────────────────────────

class _SelectionStagesCard extends StatelessWidget {
  final ApplicationStats applications;
  const _SelectionStagesCard({required this.applications});

  @override
  Widget build(BuildContext context) {
    final stages = [
      ('Diajukan', applications.newCount, AppColors.textMuted),
      ('Direview', applications.reviewing, AppColors.info),
      ('Shortlisted', applications.shortlisted, AppColors.primary),
      ('Interview', applications.interview, AppColors.violet),
      ('Diterima', applications.accepted, AppColors.success),
      ('Ditolak', applications.rejected, AppColors.danger),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: stages.map((stage) {
          final (label, count, color) = stage;
          final total = applications.total;
          final pct = total > 0 ? count / total : 0.0;

          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              children: [
                Row(
                  children: [
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
                    Text(
                      '$count',
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: pct,
                    minHeight: 6,
                    backgroundColor: AppColors.border,
                    valueColor: AlwaysStoppedAnimation<Color>(color),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─── Application Tile ───────────────────────────────────────────────────────

class _ApplicationTile extends StatelessWidget {
  final JobApplication application;
  final VoidCallback onTap;
  const _ApplicationTile({required this.application, required this.onTap});

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
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              AppAvatar(
                imageUrl: null,
                name: name,
                size: 40,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      application.vacancy?.title ?? '—',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _StatusBadge(status: application.status),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Vacancy Tile ───────────────────────────────────────────────────────────

class _VacancyTile extends StatelessWidget {
  final dynamic job;
  final VoidCallback onTap;
  const _VacancyTile({required this.job, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.business_center_outlined,
                    color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      job.title ?? '—',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [
                        job.companyName ?? '',
                        if (job.location != null && job.location!.isNotEmpty)
                          job.location!,
                      ].where((e) => e.isNotEmpty).join(' • '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.people_outline_rounded,
                        size: 14, color: AppColors.textSecondary),
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
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Status Badge ───────────────────────────────────────────────────────────

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

// ─── Quick Action Card ──────────────────────────────────────────────────────

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.15)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 24, color: color),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Section Title ──────────────────────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  final IconData icon;
  final String title;
  const _SectionTitle({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.textSecondary),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

// ─── Section Action ─────────────────────────────────────────────────────────

class _SectionAction extends StatelessWidget {
  final VoidCallback onTap;
  const _SectionAction({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: const Padding(
        padding: EdgeInsets.all(4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Lihat semua',
              style: TextStyle(
                color: AppColors.primary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: AppColors.primary, size: 16),
          ],
        ),
      ),
    );
  }
}

// ─── Empty Card ─────────────────────────────────────────────────────────────

class _EmptyCard extends StatelessWidget {
  final IconData icon;
  final String message;
  const _EmptyCard({required this.icon, required this.message});

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
