import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/role_utils.dart';
import '../../models/alumni.dart';
import 'admin_dashboard_providers.dart';
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
import 'employer_dashboard_page.dart';
import 'home_providers.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final home = ref.watch(homeDataProvider);
    final unread = ref.watch(unreadCountProvider);
    final user = auth.user;
    final unreadCount = unread.valueOrNull ?? 0;

    Future<void> onRefresh() async {
      ref.invalidate(homeDataProvider);
      ref.invalidate(unreadCountProvider);
      ref.invalidate(notificationsProvider);
      ref.invalidate(myResponsesProvider);
      await ref.read(homeDataProvider.future);
    }

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: onRefresh,
        child: home.when(
          loading: () => _HomeLayout(
            user: user,
            unreadCount: unreadCount,
            children: const [
              SizedBox(height: 96),
              LoadingView(label: 'Memuat beranda…'),
            ],
          ),
          error: (e, _) => _HomeLayout(
            user: user,
            unreadCount: unreadCount,
            children: [
              const SizedBox(height: 64),
              ErrorView(
                message: 'Gagal memuat beranda. Periksa koneksi Anda.',
                onRetry: () => ref.invalidate(homeDataProvider),
              ),
            ],
          ),
          data: (data) {
          // Employer: show dedicated dashboard instead of generic home.
          if (RoleUtils.isEmployer(user) && !RoleUtils.isAdmin(user)) {
            return const EmployerDashboardPage();
          }
          return _HomeLayout(
            user: user,
            unreadCount: unreadCount,
            children: [
              _PromoCarousel(onSurveyTap: () => context.go('/surveys'), user: user),
              const SizedBox(height: 18),
              if (data.institution == null)
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: _NoInstitutionBanner(),
                ),
              if (data.institution != null && data.institution!.name.isNotEmpty) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _InstitutionChip(name: data.institution!.name),
                ),
                const SizedBox(height: 12),
              ],
              // Admin dashboard summary cards.
              if (RoleUtils.isAdmin(user))
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: _AdminDashboardSection(),
                ),
              if (RoleUtils.isAdmin(user))
                const SizedBox(height: 16),
              // Alumni-only: profil alumni strip.
              if (data.alumni != null && RoleUtils.isAlumni(user)) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _AlumniStrip(alumni: data.alumni!),
                ),
                const SizedBox(height: 18),
              ],

              _AnnouncementsSection(items: data.announcements),
              const SizedBox(height: 16),
              // Events: not for employer.
              if (!RoleUtils.isEmployer(user) || RoleUtils.isAdmin(user)) ...[
                _EventsSection(items: data.events),
                const SizedBox(height: 16),
              ],
              _JobsSection(items: data.jobs),
              const SizedBox(height: 16),
              // Tracer history: alumni only.
              if (RoleUtils.isAlumni(user))
                const _TracerHistorySection(),
              if (RoleUtils.isAlumni(user))
                const SizedBox(height: 16),
              const _NotificationsSection(),
              const SizedBox(height: 24),
            ],
          );
          },
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------------
// Layout dasar: header gradasi ala superapp + konten scroll
// ----------------------------------------------------------------------
class _HomeLayout extends StatelessWidget {
  final User? user;
  final int unreadCount;
  final List<Widget> children;

  const _HomeLayout({
    required this.user,
    required this.unreadCount,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.zero,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: double.infinity,
              padding: EdgeInsets.fromLTRB(16, topPadding + 14, 16, 48),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
              ),
              child: _HeaderContent(user: user, unreadCount: unreadCount),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: -34,
              child: _ServicesGrid(user: user),
            ),
          ],
        ),
        const SizedBox(height: 48),
        ...children,
      ],
    );
  }
}

class _HeaderContent extends StatelessWidget {
  final User? user;
  final int unreadCount;

  const _HeaderContent({required this.user, required this.unreadCount});

  @override
  Widget build(BuildContext context) {
    final name = user?.name ?? 'Alumni';

    // Role-aware greeting subtitle.
    String subtitle;
    if (RoleUtils.isSuperAdmin(user)) {
      subtitle = 'Panel super admin — akses penuh ke seluruh platform';
    } else if (RoleUtils.isInstitutionAdmin(user)) {
      subtitle = 'Kelola data alumni & tracer study institusi Anda';
    } else if (RoleUtils.isEmployer(user)) {
      subtitle = 'Kelola lowongan kerja & lamaran masuk';
    } else {
      subtitle = 'Satu aplikasi untuk semua kebutuhan alumni';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            AppAvatar(imageUrl: user?.avatarUrl, name: name, size: 46),
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
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.72),
                      fontSize: 11.5,
                    ),
                  ),
                ],
              ),
            ),
            Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton(
                  onPressed: () => context.push('/notifications'),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.14),
                  ),
                  icon: const Icon(Icons.notifications_none_rounded,
                      size: 24, color: Colors.white),
                ),
                if (unreadCount > 0)
                  Positioned(
                    right: 2,
                    top: 2,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 1.5),
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
        ),
        const SizedBox(height: 16),
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
                const Icon(Icons.search_rounded,
                    color: AppColors.textMuted, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Cari lowongan kerja, event, atau alumni…',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: AppColors.textMuted.withValues(alpha: 0.9),
                      fontSize: 13.5,
                    ),
                  ),
                ),
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: const Icon(Icons.tune_rounded,
                      size: 17, color: AppColors.primary),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ----------------------------------------------------------------------
// Grid layanan utama (ala menu GrabFood/GrabCar)
// ----------------------------------------------------------------------
class _ServiceItem {
  final String label;
  final IconData icon;
  final Color color;
  final Color bg;
  final String route;

  const _ServiceItem(this.label, this.icon, this.color, this.bg, this.route);
}

class _ServicesGrid extends StatelessWidget {
  final User? user;

  const _ServicesGrid({this.user});

  @override
  Widget build(BuildContext context) {
    // Default alumni services.
    var services = const [
      _ServiceItem('Kuisioner', Icons.assignment_outlined, AppColors.primary,
          AppColors.primaryLight, '/surveys'),
      _ServiceItem('Lowongan', Icons.work_outline_rounded, Color(0xFFB45309),
          Color(0xFFFEF3C7), '/jobs'),
      _ServiceItem('Acara', Icons.event_outlined, AppColors.info,
          AppColors.infoBg, '/events'),
      _ServiceItem('Jejaring', Icons.people_outline_rounded, AppColors.violet,
          AppColors.violetBg, '/network'),
      _ServiceItem('Pengumuman', Icons.campaign_outlined, AppColors.danger,
          AppColors.dangerBg, '/announcements'),
      _ServiceItem('Chat', Icons.chat_bubble_outline_rounded, AppColors.success,
          AppColors.successBg, '/chat'),
      _ServiceItem('Tersimpan', Icons.bookmark_border_rounded,
          Color(0xFFDB2777), Color(0xFFFDF2F8), '/my-bookmarks'),
      _ServiceItem('Lamaranku', Icons.description_outlined, Color(0xFF0D9488),
          Color(0xFFF0FDFA), '/my-applications'),
    ];

    // Employer: lowongan management + pelamar masuk.
    if (RoleUtils.isEmployer(user) && !RoleUtils.isAdmin(user)) {
      services = const [
        _ServiceItem('Lowongan', Icons.work_outline_rounded, Color(0xFFB45309),
            Color(0xFFFEF3C7), '/jobs'),
        _ServiceItem('Kelola Lowongan', Icons.manage_accounts_outlined, AppColors.primary,
            AppColors.primaryLight, '/employer-jobs'),
        _ServiceItem('Pengumuman', Icons.campaign_outlined, AppColors.danger,
            AppColors.dangerBg, '/announcements'),
        _ServiceItem('Chat', Icons.chat_bubble_outline_rounded, AppColors.success,
            AppColors.successBg, '/chat'),
      ];
    } else if (RoleUtils.isAdmin(user)) {
      // Admin: skip Jejaring, show management-oriented services.
      services = const [
        _ServiceItem('Kuisioner', Icons.assignment_outlined, AppColors.primary,
            AppColors.primaryLight, '/surveys'),
        _ServiceItem('Lowongan', Icons.work_outline_rounded, Color(0xFFB45309),
            Color(0xFFFEF3C7), '/jobs'),
        _ServiceItem('Acara', Icons.event_outlined, AppColors.info,
            AppColors.infoBg, '/events'),
        _ServiceItem('Pengumuman', Icons.campaign_outlined, AppColors.danger,
            AppColors.dangerBg, '/announcements'),
        _ServiceItem('Chat', Icons.chat_bubble_outline_rounded, AppColors.success,
            AppColors.successBg, '/chat'),
      ];
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(8, 14, 8, 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: GridView.count(
        crossAxisCount: 4,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        mainAxisSpacing: 4,
        childAspectRatio: 0.92,
        children: [
          for (final s in services)
            _GridTile(
              label: s.label,
              icon: s.icon,
              color: s.color,
              bg: s.bg,
              onTap: () => context.push(s.route),
            ),
        ],
      ),
    );
  }
}

class _GridTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final Color bg;
  final VoidCallback onTap;

  const _GridTile({
    required this.label,
    required this.icon,
    required this.color,
    required this.bg,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
            child: Icon(icon, size: 21, color: color),
          ),
          const SizedBox(height: 7),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 11,
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
// Carousel promo (ala banner Grab)
// ----------------------------------------------------------------------
class _PromoCarousel extends StatefulWidget {
  final VoidCallback onSurveyTap;
  final User? user;

  const _PromoCarousel({required this.onSurveyTap, this.user});

  @override
  State<_PromoCarousel> createState() => _PromoCarouselState();
}

class _PromoCarouselState extends State<_PromoCarousel> {
  final _controller = PageController(viewportFraction: 0.92);
  Timer? _timer;
  int _index = 0;

  late final List<Widget> _pages = _buildPages();

  List<Widget> _buildPages() {
    final isEmployer = RoleUtils.isEmployer(widget.user) && !RoleUtils.isAdmin(widget.user);
    final pages = <Widget>[
      _PromoCard(
        title: 'Temukan pekerjaan impianmu',
        subtitle: 'Ribuan lowongan eksklusif untuk alumni terhubung',
        cta: 'Lihat lowongan',
        gradient: const [Color(0xFFF59E0B), Color(0xFFD97706)],
        icon: Icons.work_outline_rounded,
        shadowColor: const Color(0xFFD97706).withValues(alpha: 0.3),
        onTap: () => context.go('/jobs'),
      ),
    ];
    if (!isEmployer) {
      pages.add(_PromoCard(
        title: 'Kuisioner tracer study tersedia',
        subtitle: 'Isi survey dari institusi Anda dan lengkapi data tracer study',
        cta: 'Isi sekarang',
        gradient: const [AppColors.primary, AppColors.primaryDark],
        icon: Icons.edit_note_rounded,
        shadowColor: AppColors.primary.withValues(alpha: 0.3),
        onTap: widget.onSurveyTap,
      ));
    } else {
      pages.add(_PromoCard(
        title: 'Kelola lowongan Anda',
        subtitle: 'Buat, edit, dan pantau lamaran masuk untuk lowongan Anda',
        cta: 'Kelola sekarang',
        gradient: const [AppColors.primary, AppColors.primaryDark],
        icon: Icons.work_outline_rounded,
        shadowColor: AppColors.primary.withValues(alpha: 0.3),
        onTap: () => context.push('/employer-jobs'),
      ));
    }
    return pages;
  }

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!_controller.hasClients) return;
      final next = (_controller.page!.round() + 1) % _pages.length;
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          height: 128,
          child: PageView(
            controller: _controller,
            onPageChanged: (i) => setState(() => _index = i),
            children: _pages,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(_pages.length, (i) {
            final active = i == _index;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: active ? 18 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: active ? AppColors.primary : AppColors.border,
                borderRadius: BorderRadius.circular(999),
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _PromoCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String cta;
  final List<Color> gradient;
  final IconData icon;
  final Color shadowColor;
  final VoidCallback onTap;

  const _PromoCard({
    required this.title,
    required this.subtitle,
    required this.cta,
    required this.gradient,
    required this.icon,
    required this.shadowColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: gradient,
            ),
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(color: shadowColor, blurRadius: 16, offset: const Offset(0, 6)),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(icon, color: Colors.white, size: 25),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.78),
                        fontSize: 11.5,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        cta,
                        style: TextStyle(
                          color: gradient.last,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                        ),
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

// ----------------------------------------------------------------------
// Banner institusi & profil alumni
// ----------------------------------------------------------------------
class _NoInstitutionBanner extends StatelessWidget {
  const _NoInstitutionBanner();

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

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            icon: Icons.badge_outlined,
            title: 'Profil Alumni',
            action: _SectionAction(onTap: () => context.go('/profile')),
          ),
          const SizedBox(height: 10),
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
          Row(
            children: [
              Expanded(
                child: _InfoTile(
                  label: 'Status Kerja',
                  child: AppBadge(
                    label: AppConstants.employmentStatusLabel(alumni.employmentStatus),
                    tone: _statusTone(alumni.employmentStatus),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (alumni.graduationYear != null)
                Expanded(
                  child: _InfoTile(
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
                )
              else
                const Spacer(),
            ],
          ),
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
      ),
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
        color: AppColors.background,
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
// Kartu feed & baris konten
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

class _FeedSection extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String emptyLabel;
  final Widget action;
  final List<Widget> rows;

  const _FeedSection({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.emptyLabel,
    required this.action,
    required this.rows,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: _FeedCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(
              icon: icon,
              title: title,
              action: action,
            ),
            const SizedBox(height: 6),
            if (rows.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Center(
                  child: Text(
                    emptyLabel,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                  ),
                ),
              )
            else
              ...rows,
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
    return _FeedSection(
      icon: Icons.campaign_outlined,
      iconColor: AppColors.violet,
      title: 'Pengumuman Terbaru',
      emptyLabel: 'Belum ada pengumuman',
      action: _SectionAction(onTap: () => context.push('/announcements')),
      rows: items
          .map(
            (a) => _FeedListRow(
              title: a.title,
              subtitle: a.body,
              meta: Formatters.formatDateFromString(a.publishedAt ?? a.createdAt),
              leadingIcon: Icons.campaign_outlined,
              leadingColor: AppColors.violet,
              onTap: () => context.push('/announcement/${a.id}'),
            ),
          )
          .toList(),
    );
  }
}

class _EventsSection extends StatelessWidget {
  final List<EventItem> items;
  const _EventsSection({required this.items});

  @override
  Widget build(BuildContext context) {
    return _FeedSection(
      icon: Icons.event_outlined,
      iconColor: AppColors.info,
      title: 'Acara Mendatang',
      emptyLabel: 'Belum ada acara',
      action: _SectionAction(onTap: () => context.push('/events')),
      rows: items
          .map(
            (e) => _FeedListRow(
              title: e.title,
              subtitle: e.location,
              meta: Formatters.formatDateFromString(e.startsAt),
              leadingIcon: Icons.event_outlined,
              leadingColor: AppColors.info,
              onTap: () => context.push('/event/${e.id}'),
            ),
          )
          .toList(),
    );
  }
}

class _JobsSection extends StatelessWidget {
  final List<JobVacancy> items;
  const _JobsSection({required this.items});

  @override
  Widget build(BuildContext context) {
    return _FeedSection(
      icon: Icons.work_outline_rounded,
      iconColor: AppColors.warning,
      title: 'Lowongan Terbaru',
      emptyLabel: 'Belum ada lowongan',
      action: _SectionAction(onTap: () => context.go('/jobs')),
      rows: items
          .map(
            (j) => _FeedListRow(
              title: j.title,
              subtitle: j.companyName,
              meta: j.location,
              leadingIcon: Icons.business_center_outlined,
              leadingColor: AppColors.warning,
              onTap: () => context.push('/job/${j.id}'),
            ),
          )
          .toList(),
    );
  }
}

class _NotificationsSection extends ConsumerWidget {
  const _NotificationsSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);
    final items = notifications.valueOrNull?.items ?? <NotificationItem>[];
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;

    final rows = items.take(4).map(
          (n) => _FeedListRow(
            title: n.title,
            subtitle: n.body,
            meta: Formatters.formatDateTimeFromString(n.createdAt),
            leadingIcon: Icons.notifications_none_rounded,
            leadingColor: n.isRead ? AppColors.textMuted : AppColors.primary,
            onTap: () => context.push('/notifications'),
          ),
        ).toList();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: _FeedCard(
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
            const SizedBox(height: 6),
            if (rows.isEmpty)
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
              ...rows,
          ],
        ),
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

    return _FeedSection(
      icon: Icons.assignment_outlined,
      iconColor: AppColors.success,
      title: 'Riwayat Tracer Study',
      emptyLabel: 'Belum ada respons survey',
      action: _SectionAction(
        onTap: () => context.push('/surveys', extra: {'tab': 'history'}),
      ),
      rows: items.take(4).map(
        (r) {
          final submitted = r.status == 'submitted';
          return _FeedListRow(
            title: r.surveyTitle ?? 'Survey',
            subtitle: r.submittedAt != null
                ? 'Selesai ${Formatters.formatDateTimeFromString(r.submittedAt)}'
                : 'Dimulai ${Formatters.formatDateTimeFromString(r.startedAt)}',
            meta: r.completion != null ? '${r.completion}%' : null,
            leadingIcon: Icons.assignment_turned_in_outlined,
            leadingColor: submitted ? AppColors.success : AppColors.warning,
            onTap: () {
              if (submitted) {
                context.push('/response/${r.id}');
              } else if (r.surveyId != null) {
                context.push('/survey/${r.surveyId}');
              }
            },
          );
        },
      ).toList(),
    );
  }
}

// ------------------------------------------------------------------
// Admin dashboard summary cards
// ------------------------------------------------------------------
class _AdminDashboardSection extends ConsumerWidget {
  const _AdminDashboardSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dash = ref.watch(adminDashboardProvider);

    return dash.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (data) => _FeedCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(
              icon: Icons.analytics_outlined,
              title: 'Ringkasan Dashboard',
              action: _SectionAction(onTap: () => context.go('/home')),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _DashboardStat(
                    label: 'Total Alumni',
                    value: '${data.totalAlumni}',
                    icon: Icons.people_outline_rounded,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _DashboardStat(
                    label: 'Responden',
                    value: '${data.totalRespondents}',
                    icon: Icons.assignment_turned_in_outlined,
                    color: AppColors.success,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _DashboardStat(
                    label: 'Tingkat Respons',
                    value: '${data.responseRate}%',
                    icon: Icons.show_chart_rounded,
                    color: AppColors.info,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _DashboardStat(
                    label: 'Survey Aktif',
                    value: '${data.publishedSurveys}',
                    icon: Icons.quiz_outlined,
                    color: AppColors.violet,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DashboardStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _DashboardStat({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.15)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
