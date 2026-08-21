import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/alumni.dart';
import '../../models/announcement.dart';
import '../../models/event.dart';
import '../../models/job_vacancy.dart';
import '../../models/notification_item.dart';
import '../../models/survey_response.dart';
import '../../models/user.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../../shared/widgets/section_header.dart';
import '../auth/auth_controller.dart';
import '../notifications/notifications_providers.dart';
import '../surveys/survey_providers.dart';
import 'home_providers.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final home = ref.watch(homeDataProvider);
    final unread = ref.watch(unreadCountProvider);
    final user = auth.user;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(homeDataProvider);
            ref.invalidate(unreadCountProvider);
            ref.invalidate(notificationsProvider);
            ref.invalidate(myResponsesProvider);
            await ref.read(homeDataProvider.future);
          },
          child: home.when(
            loading: () => const LoadingView(label: 'Memuat beranda…'),
            error: (e, _) => ListView(
              children: [
                _Greeting(user: user, unreadCount: unread.valueOrNull ?? 0, onBellTap: () => context.push('/notifications')),
                const SizedBox(height: 80),
                ErrorView(
                  message: 'Gagal memuat beranda. Periksa koneksi Anda.',
                  onRetry: () => ref.invalidate(homeDataProvider),
                ),
              ],
            ),
            data: (data) => ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                _Greeting(
                  user: user,
                  unreadCount: unread.valueOrNull ?? 0,
                  onBellTap: () => context.push('/notifications'),
                ),
                const SizedBox(height: 18),
                if (data.institution == null) _NoInstitutionBanner(),
                if (data.institution != null && data.institution!.name.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _InstitutionChip(name: data.institution!.name),
                ],
                if (data.alumni != null) ...[
                  const SizedBox(height: 12),
                  _AlumniStrip(alumni: data.alumni!),
                ],
                const SizedBox(height: 20),
                _AnnouncementsSection(items: data.announcements),
                const SizedBox(height: 16),
                _EventsSection(items: data.events),
                const SizedBox(height: 16),
                _JobsSection(items: data.jobs),
                const SizedBox(height: 16),
                _NotificationsSection(),
                const SizedBox(height: 16),
                const _TracerHistorySection(),
                const SizedBox(height: 16),
                _SurveyCta(onTap: () => context.go('/surveys')),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------------
// Greeting header
// ----------------------------------------------------------------------
class _Greeting extends StatelessWidget {
  final User? user;
  final int unreadCount;
  final VoidCallback onBellTap;

  const _Greeting({required this.user, required this.unreadCount, required this.onBellTap});

  @override
  Widget build(BuildContext context) {
    final name = user?.name ?? 'Alumni';
    final avatarUrl = user?.avatarUrl;

    return Row(
      children: [
        AppAvatar(imageUrl: avatarUrl, name: name, size: 52),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Halo, $name 👋',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 4),
              const Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  AppBadge(label: 'Alumni', tone: BadgeTone.navy),
                ],
              ),
            ],
          ),
        ),
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              onPressed: onBellTap,
              icon: const Icon(Icons.notifications_none_rounded, size: 26),
            ),
            if (unreadCount > 0)
              Positioned(
                right: 4,
                top: 2,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: AppColors.danger,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Colors.white, width: 1.4),
                  ),
                  child: Text(
                    unreadCount > 9 ? '9+' : '$unreadCount',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _NoInstitutionBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.warningBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline_rounded, color: AppColors.warning, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Akun belum terhubung ke institusi',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'Pengumuman, acara, dan lowongan akan muncul setelah akun dihubungkan oleh pengelola institusi.',
                  style: TextStyle(color: Color(0xFF92400E), fontSize: 12, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InstitutionChip extends StatelessWidget {
  final String name;
  const _InstitutionChip({required this.name});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.school_outlined, size: 16, color: AppColors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ----------------------------------------------------------------------
// Alumni profile strip
// ----------------------------------------------------------------------
class _AlumniStrip extends StatelessWidget {
  final AlumniHomeProfile alumni;

  const _AlumniStrip({required this.alumni});

  @override
  Widget build(BuildContext context) {
    final careerLines = <String>[
      if (alumni.careerLine != null && alumni.careerLine!.isNotEmpty) alumni.careerLine!,
      if (alumni.careerField != null && alumni.careerField!.isNotEmpty) alumni.careerField!,
      if (alumni.careerLocation != null && alumni.careerLocation!.isNotEmpty) alumni.careerLocation!,
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _InfoTile(
                label: 'NIS/NIM',
                child: Text(
                  alumni.nisNim ?? '—',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _InfoTile(
                label: 'Jurusan',
                child: Text(
                  alumni.department ?? '—',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        _InfoTile(
          label: 'Status Kerja',
          child: AppBadge(
            label: AppConstants.employmentStatusLabel(alumni.employmentStatus),
            tone: _statusTone(alumni.employmentStatus),
          ),
        ),
        if (alumni.graduationYear != null) ...[
          const SizedBox(height: 8),
          _InfoTile(
            label: 'Tahun Lulus',
            child: Text(
              '${alumni.graduationYear}',
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
        if (careerLines.isNotEmpty) ...[
          const SizedBox(height: 8),
          _InfoTile(
            label: 'Detail Karir',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: careerLines
                  .map(
                    (line) => Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Text(
                        line,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
        ],
      ],
    );
  }
}

class _InfoTile extends StatelessWidget {
  final String label;
  final Widget child;

  const _InfoTile({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
          ),
          const SizedBox(height: 4),
          child,
        ],
      ),
    );
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

// ----------------------------------------------------------------------
// Feed cards
// ----------------------------------------------------------------------
class _FeedCard extends StatelessWidget {
  final Widget child;

  const _FeedCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _FeedListRow extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? meta;
  final IconData leadingIcon;
  final Color leadingColor;
  final VoidCallback onTap;

  const _FeedListRow({
    required this.title,
    this.subtitle,
    this.meta,
    required this.leadingIcon,
    required this.leadingColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: leadingColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(leadingIcon, size: 19, color: leadingColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (subtitle != null && subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    ),
                  ],
                ],
              ),
            ),
            if (meta != null) ...[
              const SizedBox(width: 8),
              Text(meta!, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
            ],
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20),
          ],
        ),
      ),
    );
  }
}

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

class _AnnouncementsSection extends StatelessWidget {
  final List<Announcement> items;
  const _AnnouncementsSection({required this.items});

  @override
  Widget build(BuildContext context) {
    return _FeedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            icon: Icons.campaign_outlined,
            title: 'Pengumuman Terbaru',
            action: _SectionAction(onTap: () => context.push('/announcements')),
          ),
          const SizedBox(height: 6),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Center(
                child: Text(
                  'Belum ada pengumuman',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                ),
              ),
            )
          else
            ...items.map(
              (a) => _FeedListRow(
                title: a.title,
                subtitle: a.body,
                meta: Formatters.formatDateFromString(a.publishedAt ?? a.createdAt),
                leadingIcon: Icons.campaign_outlined,
                leadingColor: AppColors.violet,
                onTap: () => context.push('/announcements'),
              ),
            ),
        ],
      ),
    );
  }
}

class _EventsSection extends StatelessWidget {
  final List<EventItem> items;
  const _EventsSection({required this.items});

  @override
  Widget build(BuildContext context) {
    return _FeedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            icon: Icons.event_outlined,
            title: 'Acara Mendatang',
            action: _SectionAction(onTap: () => context.push('/events')),
          ),
          const SizedBox(height: 6),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Center(
                child: Text(
                  'Belum ada acara',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                ),
              ),
            )
          else
            ...items.map(
              (e) => _FeedListRow(
                title: e.title,
                subtitle: e.location,
                meta: Formatters.formatDateFromString(e.startsAt),
                leadingIcon: Icons.event_outlined,
                leadingColor: AppColors.info,
                onTap: () => context.push('/events'),
              ),
            ),
        ],
      ),
    );
  }
}

class _JobsSection extends StatelessWidget {
  final List<JobVacancy> items;
  const _JobsSection({required this.items});

  @override
  Widget build(BuildContext context) {
    return _FeedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            icon: Icons.work_outline_rounded,
            title: 'Lowongan Terbaru',
            action: _SectionAction(onTap: () => context.go('/jobs')),
          ),
          const SizedBox(height: 6),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Center(
                child: Text(
                  'Belum ada lowongan',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                ),
              ),
            )
          else
            ...items.map(
              (j) => _FeedListRow(
                title: j.title,
                subtitle: j.companyName,
                meta: j.location,
                leadingIcon: Icons.business_center_outlined,
                leadingColor: AppColors.warning,
                onTap: () => context.push('/job/${j.id}'),
              ),
            ),
        ],
      ),
    );
  }
}

class _NotificationsSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);
    final items = notifications.valueOrNull?.items ?? <NotificationItem>[];
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;

    return _FeedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            icon: Icons.notifications_none_rounded,
            title: 'Notifikasi',
            subtitle: unread > 0 ? '$unread belum dibaca' : 'Semua sudah dibaca',
            action: _SectionAction(onTap: () => context.push('/notifications')),
          ),
          if (unread > 0) ...[
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () async {
                  await ref.read(notificationsRepositoryProvider).markAllRead();
                  ref.invalidate(unreadCountProvider);
                  ref.invalidate(notificationsProvider);
                },
                child: const Text('Tandai semua dibaca'),
              ),
            ),
          ],
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Center(
                child: Text(
                  'Belum ada notifikasi',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                ),
              ),
            )
          else
            ...items.take(5).map(
                  (n) => _FeedListRow(
                    title: n.title,
                    subtitle: n.body,
                    meta: Formatters.formatDateTimeFromString(n.createdAt),
                    leadingIcon: Icons.notifications_none_rounded,
                    leadingColor: n.isRead ? AppColors.textMuted : AppColors.primary,
                    onTap: () => context.push('/notifications'),
                  ),
                ),
        ],
      ),
    );
  }
}

class _TracerHistorySection extends ConsumerWidget {
  const _TracerHistorySection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final responses = ref.watch(myResponsesProvider);
    final items = responses.valueOrNull?.items ?? <SurveyResponseItem>[];

    return _FeedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            icon: Icons.assignment_outlined,
            title: 'Riwayat Tracer Study',
            subtitle: 'Respons survey yang pernah Anda isi',
            action: _SectionAction(onTap: () => context.push('/surveys', extra: {'tab': 'history'})),
          ),
          const SizedBox(height: 6),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Center(
                child: Text(
                  'Belum ada respons survey',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                ),
              ),
            )
          else
            ...items.take(5).map(
                  (r) => _FeedListRow(
                    title: r.surveyTitle ?? 'Survey',
                    subtitle: r.submittedAt != null
                        ? 'Selesai ${Formatters.formatDateTimeFromString(r.submittedAt)}'
                        : 'Dimulai ${Formatters.formatDateTimeFromString(r.startedAt)}',
                    meta: r.completion != null ? '${r.completion}%' : null,
                    leadingIcon: Icons.assignment_turned_in_outlined,
                    leadingColor: r.status == 'submitted' ? AppColors.success : AppColors.warning,
                    onTap: () {
                      if (r.status == 'submitted') {
                        context.push('/response/${r.id}');
                      } else if (r.surveyId != null) {
                        context.push('/survey/${r.surveyId}');
                      }
                    },
                  ),
                ),
        ],
      ),
    );
  }
}

class _SurveyCta extends StatelessWidget {
  final VoidCallback onTap;
  const _SurveyCta({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.primary, AppColors.primaryDark],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.3),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.edit_note_rounded, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Kuisioner tracer study tersedia',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Isi survey dari institusi Anda dan lengkapi data tracer study',
                    style: TextStyle(color: Color(0xFFCBD5F5), fontSize: 12),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_rounded, color: Colors.white),
          ],
        ),
      ),
    );
  }
}
