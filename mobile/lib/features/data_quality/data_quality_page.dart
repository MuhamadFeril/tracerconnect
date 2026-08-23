import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'data_quality_providers.dart';
import 'data_quality_repository.dart';

class DataQualityPage extends ConsumerWidget {
  const DataQualityPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(dataQualityProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        title: const Text(
          'Kualitas Data',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      body: report.when(
        loading: () => const LoadingView(label: 'Memuat laporan…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat laporan kualitas data.',
          onRetry: () => ref.invalidate(dataQualityProvider),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(dataQualityProvider);
            await ref.read(dataQualityProvider.future);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              // Health Score
              _HealthScoreCard(score: data.healthScore, status: data.healthStatus),
              const SizedBox(height: 16),

              // Summary Stats
              Row(
                children: [
                  Expanded(
                    child: _StatMini(
                      label: 'Total Alumni',
                      value: '${data.totalAlumni}',
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _StatMini(
                      label: 'Duplikat',
                      value: '${data.duplicates.totalDuplicates}',
                      color: AppColors.warning,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _StatMini(
                      label: 'Tidak Lengkap',
                      value: '${data.profileIssues.incompleteProfiles}',
                      color: AppColors.danger,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Missing Fields
              _SectionTitle(icon: Icons.info_outline, title: 'Field Yang Kosong'),
              const SizedBox(height: 8),
              _MissingFieldsCard(missing: data.missingFields, total: data.totalAlumni),
              const SizedBox(height: 20),

              // Profile Issues
              _SectionTitle(icon: Icons.warning_amber_rounded, title: 'Masalah Profil'),
              const SizedBox(height: 8),
              _ProfileIssuesCard(issues: data.profileIssues, total: data.totalAlumni),
              const SizedBox(height: 20),

              // Duplicates
              if (data.duplicates.groups.isNotEmpty) ...[
                _SectionTitle(icon: Icons.content_copy_rounded, title: 'Kemungkinan Duplikat'),
                const SizedBox(height: 8),
                _DuplicatesCard(duplicates: data.duplicates),
                const SizedBox(height: 20),
              ],

              // Recommendations
              if (data.recommendations.isNotEmpty) ...[
                _SectionTitle(icon: Icons.lightbulb_outline, title: 'Rekomendasi'),
                const SizedBox(height: 8),
                _RecommendationsCard(recommendations: data.recommendations),
                const SizedBox(height: 24),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Health Score Card ──────────────────────────────────────────────────────

class _HealthScoreCard extends StatelessWidget {
  final int score;
  final String status;

  const _HealthScoreCard({required this.score, required this.status});

  @override
  Widget build(BuildContext context) {
    final (color, bgColor) = switch (score) {
      >= 90 => (AppColors.success, AppColors.successBg),
      >= 75 => (AppColors.primary, AppColors.primaryLight),
      >= 60 => (AppColors.warning, AppColors.warningBg),
      >= 40 => (const Color(0xFFEA580C), const Color(0xFFFFF7ED)),
      _ => (AppColors.danger, AppColors.dangerBg),
    };

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          SizedBox(
            width: 100,
            height: 100,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 100,
                  height: 100,
                  child: CircularProgressIndicator(
                    value: score / 100,
                    strokeWidth: 8,
                    backgroundColor: color.withValues(alpha: 0.15),
                    valueColor: AlwaysStoppedAnimation<Color>(color),
                  ),
                ),
                Text(
                  '$score',
                  style: TextStyle(
                    color: color,
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            status,
            style: TextStyle(
              color: color,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Skor Kualitas Data',
            style: TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

// ─── Stat Mini ──────────────────────────────────────────────────────────────

class _StatMini extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatMini({required this.label, required this.value, required this.color});

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
          ),
        ],
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

// ─── Missing Fields Card ────────────────────────────────────────────────────

class _MissingFieldsCard extends StatelessWidget {
  final MissingFields missing;
  final int total;

  const _MissingFieldsCard({required this.missing, required this.total});

  @override
  Widget build(BuildContext context) {
    final items = missing.asList.where((f) => f.count > 0).toList()
      ..sort((a, b) => b.count.compareTo(a.count));

    if (items.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: const Center(
          child: Text(
            'Semua field sudah terisi ✓',
            style: TextStyle(color: AppColors.success, fontWeight: FontWeight.w600),
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: items.map((item) {
          final pct = total > 0 ? (item.count / total * 100).round() : 0;
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      item.label,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${item.count}',
                      style: const TextStyle(
                        color: AppColors.danger,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: pct / 100,
                    minHeight: 5,
                    backgroundColor: AppColors.border,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.danger),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$pct% kosong',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─── Profile Issues Card ────────────────────────────────────────────────────

class _ProfileIssuesCard extends StatelessWidget {
  final ProfileIssues issues;
  final int total;

  const _ProfileIssuesCard({required this.issues, required this.total});

  @override
  Widget build(BuildContext context) {
    final items = [
      (label: 'Tanpa Akun', count: issues.withoutUserAccount, color: AppColors.warning),
      (label: 'Tidak Terjangkau', count: issues.unreachable, color: AppColors.danger),
      (label: 'Profil Tidak Lengkap', count: issues.incompleteProfiles, color: const Color(0xFFEA580C)),
      (label: 'Profil Stale (>6 bln)', count: issues.staleProfiles, color: AppColors.info),
    ];

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: items.map((item) {
          final pct = total > 0 ? (item.count / total * 100).round() : 0;
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      item.label,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${item.count}',
                      style: TextStyle(
                        color: item.color,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: pct / 100,
                    minHeight: 5,
                    backgroundColor: AppColors.border,
                    valueColor: AlwaysStoppedAnimation<Color>(item.color),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$pct% dari total',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─── Duplicates Card ────────────────────────────────────────────────────────

class _DuplicatesCard extends StatelessWidget {
  final DuplicateInfo duplicates;

  const _DuplicatesCard({required this.duplicates});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: duplicates.groups.take(10).map((group) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        group.name,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (group.graduationYearId != null)
                        Text(
                          'Tahun lulus: ${group.graduationYearId}',
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                        ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.warningBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${group.count}x',
                    style: const TextStyle(
                      color: AppColors.warning,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
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

// ─── Recommendations Card ───────────────────────────────────────────────────

class _RecommendationsCard extends StatelessWidget {
  final List<Recommendation> recommendations;

  const _RecommendationsCard({required this.recommendations});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: recommendations.map((rec) {
          final (icon, color) = switch (rec.priority) {
            'high' => (Icons.cancel_rounded, AppColors.danger),
            'medium' => (Icons.warning_amber_rounded, AppColors.warning),
            _ => (Icons.info_outline, AppColors.info),
          };

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, size: 18, color: color),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    rec.message,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    rec.priority == 'high'
                        ? 'Tinggi'
                        : rec.priority == 'medium'
                            ? 'Sedang'
                            : 'Rendah',
                    style: TextStyle(
                      color: color,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                    ),
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
