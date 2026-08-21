import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

/// Mobile-native landing page for TracerConnect.
///
/// Designed specifically for small screens — NOT a copy of the web landing.
/// Uses horizontal paging, compact cards, and native Flutter patterns.
class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  final _pageCtrl = PageController(viewportFraction: 0.88);
  final _scrollCtrl = ScrollController();
  int _featurePage = 0;

  @override
  void dispose() {
    _pageCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // ── Hero (no animation — visible immediately) ─────────────
            SliverToBoxAdapter(child: _HeroSection(onLogin: () => context.push('/login'), onRegister: () => context.push('/register'))),

            // ── Stats strip ───────────────────────────────────────────
            SliverToBoxAdapter(child: _ScrollReveal(ctrl: _scrollCtrl, child: _StatsStrip())),

            // ── Features (horizontal paged) ───────────────────────────
            SliverToBoxAdapter(child: _ScrollReveal(ctrl: _scrollCtrl, child: _FeaturesHeader())),
            SliverToBoxAdapter(
              child: _ScrollReveal(
                ctrl: _scrollCtrl,
                child: SizedBox(
                  height: 220,
                  child: PageView.builder(
                    controller: _pageCtrl,
                    itemCount: _featureCards.length,
                    onPageChanged: (i) => setState(() => _featurePage = i),
                    itemBuilder: (_, i) => _FeatureCard(data: _featureCards[i]),
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(child: _ScrollReveal(ctrl: _scrollCtrl, delayMs: 100, child: _PageDots(count: _featureCards.length, current: _featurePage))),

            // ── Problem → Solution ────────────────────────────────────
            SliverToBoxAdapter(child: _ScrollReveal(ctrl: _scrollCtrl, child: _ProblemSolutionSection())),

            // ── Workflow steps ────────────────────────────────────────
            SliverToBoxAdapter(child: _ScrollReveal(ctrl: _scrollCtrl, child: _WorkflowSection())),

            // ── Career Center ─────────────────────────────────────────
            SliverToBoxAdapter(child: _ScrollReveal(ctrl: _scrollCtrl, child: _CareerSection())),

            // ── Alumni Networking ─────────────────────────────────────
            SliverToBoxAdapter(child: _ScrollReveal(ctrl: _scrollCtrl, child: _AlumniNetworkSection())),

            // ── FAQ ───────────────────────────────────────────────────
            SliverToBoxAdapter(child: _ScrollReveal(ctrl: _scrollCtrl, child: _FaqSection())),

            // ── CTA ───────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: _ScrollReveal(
                ctrl: _scrollCtrl,
                child: _CtaSection(
                  onLogin: () => context.push('/login'),
                  onRegister: () => context.push('/register'),
                ),
              ),
            ),

            // ── Footer ────────────────────────────────────────────────
            SliverToBoxAdapter(child: _ScrollReveal(ctrl: _scrollCtrl, child: _Footer())),
            const SliverToBoxAdapter(child: SizedBox(height: 48)),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCROLL REVEAL — fade-in + slide-up when section enters viewport
// ═══════════════════════════════════════════════════════════════════════════

class _ScrollReveal extends StatefulWidget {
  final ScrollController ctrl;
  final Widget child;
  final int delayMs;

  const _ScrollReveal({required this.ctrl, required this.child, this.delayMs = 0});

  @override
  State<_ScrollReveal> createState() => _ScrollRevealState();
}

class _ScrollRevealState extends State<_ScrollReveal>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ac;
  late final Animation<double> _opacityAnim;
  late final Animation<Offset> _slideAnim;
  final _key = GlobalKey();
  bool _revealed = false;

  @override
  void initState() {
    super.initState();
    _ac = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
    _opacityAnim = CurvedAnimation(parent: _ac, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.12),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ac, curve: Curves.easeOutCubic));

    widget.ctrl.addListener(_check);
    WidgetsBinding.instance.addPostFrameCallback((_) => _check());
  }

  void _check() {
    if (_revealed || !mounted) return;
    final ctx = _key.currentContext;
    if (ctx == null) return;
    final box = ctx.findRenderObject() as RenderBox?;
    if (box == null || !box.attached) return;

    final top = box.localToGlobal(Offset.zero).dy;
    final viewH = widget.ctrl.position.viewportDimension;

    if (top < viewH * 0.88) {
      _revealed = true;
      if (widget.delayMs > 0) {
        Future.delayed(Duration(milliseconds: widget.delayMs), () {
          if (mounted) _ac.forward();
        });
      } else {
        _ac.forward();
      }
    }
  }

  @override
  void dispose() {
    widget.ctrl.removeListener(_check);
    _ac.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ac,
      builder: (_, child) {
        return Opacity(
          opacity: _opacityAnim.value,
          child: Transform.translate(
            offset: _slideAnim.value * 30,
            child: child,
          ),
        );
      },
      child: KeyedSubtree(key: _key, child: widget.child),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════════════════════

class _HeroSection extends StatelessWidget {
  final VoidCallback onLogin;
  final VoidCallback onRegister;
  const _HeroSection({required this.onLogin, required this.onRegister});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 28),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primary, Color(0xFF2548A3), AppColors.primaryDark],
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(color: AppColors.primary.withValues(alpha: 0.35), blurRadius: 28, offset: const Offset(0, 10)),
        ],
      ),
      child: Column(
        children: [
          // Logo
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 16, offset: const Offset(0, 6))],
            ),
            child: const Icon(Icons.school_rounded, color: AppColors.primary, size: 34),
          ),
          const SizedBox(height: 18),
          const Text(
            'TracerConnect',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.5),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(16)),
            child: const Text(
              'Tracer Study & Alumni Platform',
              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Kelola tracer study, karier, dan jejaring alumni — dalam satu genggaman.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFFCBD5F5), fontSize: 14, height: 1.6),
          ),
          const SizedBox(height: 22),
          // CTA
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: onRegister,
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Coba Gratis Sekarang'),
                  SizedBox(width: 8),
                  Icon(Icons.arrow_forward_rounded, size: 18),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 46,
            child: OutlinedButton(
              onPressed: onLogin,
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: const BorderSide(color: Colors.white38),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
              child: const Text('Masuk'),
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS STRIP
// ═══════════════════════════════════════════════════════════════════════════

class _StatsStrip extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const stats = [
      ('1.200+', 'Alumni'),
      ('85%', 'Response Rate'),
      ('72%', 'Employment'),
      ('50+', 'Institusi'),
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Row(
        children: stats.map((s) {
          final idx = stats.indexOf(s);
          return Expanded(
            child: Container(
              margin: EdgeInsets.only(right: idx < stats.length - 1 ? 8 : 0),
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  Text(s.$1, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.primary)),
                  const SizedBox(height: 2),
                  Text(s.$2, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURES (paged horizontal)
// ═══════════════════════════════════════════════════════════════════════════

class _FeatureData {
  final IconData icon;
  final Color color;
  final String title;
  final String desc;
  const _FeatureData(this.icon, this.color, this.title, this.desc);
}

const _featureCards = [
  _FeatureData(Icons.dashboard_rounded, Color(0xFF4F46E5), 'Dashboard Cerdas', 'Lihat kondisi alumni, response rate, dan analytics dalam satu layar.'),
  _FeatureData(Icons.edit_note_rounded, Color(0xFF7C3AED), 'Kuisioner Drag-and-Drop', 'Buat survey tanpa coding. Section, logika kondisional, draft & resume.'),
  _FeatureData(Icons.people_rounded, Color(0xFF059669), 'Manajemen Alumni', 'Import CSV/Excel, filter jurusan & angkatan, kelola profil alumni.'),
  _FeatureData(Icons.work_rounded, Color(0xFFD97706), 'Career Center', 'Job board, bookmark, lamar, dan pantau status lamaran alumni.'),
  _FeatureData(Icons.handshake_rounded, Color(0xFF0284C7), 'Jejaring Alumni', 'Cari alumni, koneksi, terima/tolak — tanpa fitur chat yang ribet.'),
  _FeatureData(Icons.event_rounded, Color(0xFFDC2626), 'Event & Pengumuman', 'Buat acara, undang alumni, pantau kehadiran, kirim notifikasi.'),
  _FeatureData(Icons.description_rounded, Color(0xFF4F46E5), 'Laporan Sekali Klik', 'Executive summary, PDF, Excel — siap presentasi untuk pimpinan.'),
  _FeatureData(Icons.analytics_rounded, Color(0xFF7C3AED), 'Analytics Otomatis', 'Response rate, employment rate, distribusi industri — real-time.'),
];

class _FeaturesHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.fromLTRB(20, 28, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('FITUR UNGGULAN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.0, color: AppColors.primary)),
          SizedBox(height: 4),
          Text('Geser untuk lihat semua →', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final _FeatureData data;
  const _FeatureCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 6),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: data.color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(data.icon, color: data.color, size: 26),
          ),
          const SizedBox(height: 16),
          Text(data.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          Expanded(
            child: Text(data.desc, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.5)),
          ),
        ],
      ),
    );
  }
}

class _PageDots extends StatelessWidget {
  final int count;
  final int current;
  const _PageDots({required this.count, required this.current});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (i) => AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        margin: const EdgeInsets.symmetric(horizontal: 3),
        width: i == current ? 20 : 6,
        height: 6,
        decoration: BoxDecoration(
          color: i == current ? AppColors.primary : AppColors.border,
          borderRadius: BorderRadius.circular(3),
        ),
      )),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROBLEM → SOLUTION (compact)
// ═══════════════════════════════════════════════════════════════════════════

class _ProblemSolutionSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('MASALAH → SOLUSI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.0, color: AppColors.primary)),
          const SizedBox(height: 12),
          // Problem cards
          ..._problems.map((p) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                Container(width: 28, height: 28, decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.close_rounded, color: AppColors.danger, size: 16)),
                const SizedBox(width: 10),
                Expanded(child: Text(p, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textPrimary))),
              ],
            ),
          )),
          const SizedBox(height: 4),
          // Arrow
          Center(child: Icon(Icons.arrow_downward_rounded, color: AppColors.primary.withValues(alpha: 0.4), size: 24)),
          const SizedBox(height: 4),
          // Solution card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [AppColors.primary.withValues(alpha: 0.06), AppColors.primaryLight]),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('TracerConnect', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.primary)),
                const SizedBox(height: 8),
                ..._solutions.map((s) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Icon(s.$1, color: AppColors.primary, size: 16),
                      const SizedBox(width: 8),
                      Expanded(child: Text(s.$2, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary))),
                    ],
                  ),
                )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

const _problems = [
  'Data alumni tersebar di banyak file',
  'Rekap manual makan waktu berhari-hari',
  'Sulit memantau siapa yang sudah mengisi',
];

const _solutions = [
  (Icons.storage_rounded, 'Database alumni terpusat & aman'),
  (Icons.auto_awesome_rounded, 'Kuisioner dinamis tanpa coding'),
  (Icons.trending_up_rounded, 'Analytics & laporan otomatis'),
  (Icons.work_outline_rounded, 'Career center untuk alumni aktif'),
  (Icons.people_outline_rounded, 'Jejaring alumni & event'),
];

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════

class _WorkflowSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('CARA KERJA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.0, color: AppColors.primary)),
          const SizedBox(height: 4),
          const Text('5 langkah mudah', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
          const SizedBox(height: 16),
          ...List.generate(_workflowSteps.length, (i) {
            final isLast = i == _workflowSteps.length - 1;
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: i == 0 ? AppColors.primary : AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(9),
                      ),
                      child: Center(
                        child: Text('${i + 1}',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: i == 0 ? Colors.white : AppColors.primary)),
                      ),
                    ),
                    if (!isLast) Container(width: 2, height: 20, color: AppColors.border),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(_workflowSteps[i], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                  ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }
}

const _workflowSteps = [
  'Buat akun institusi & import alumni',
  'Rancang kuisioner dengan builder',
  'Publish tracer study ke alumni',
  'Alumni mengisi dari ponsel',
  'Lihat analytics & unduh laporan',
];

// ═══════════════════════════════════════════════════════════════════════════
// CAREER CENTER
// ═══════════════════════════════════════════════════════════════════════════

class _CareerSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('CAREER CENTER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.0, color: Color(0xFF818CF8))),
          const SizedBox(height: 8),
          const Text('Lebih dari Sekadar Tracer Study',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
          const SizedBox(height: 6),
          const Text(
            'Alumni bisa mencari, menyimpan, dan melamar lowongan — institusi bisa menghubungkan lulusan dengan dunia kerja.',
            style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8), height: 1.5),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _careerStat(Icons.work_outline_rounded, '120+', 'Lowongan Aktif'),
              const SizedBox(width: 8),
              _careerStat(Icons.send_outlined, '450+', 'Lamaran Terkirim'),
              const SizedBox(width: 8),
              _careerStat(Icons.check_circle_outline, '320+', 'Diterima'),
            ],
          ),
        ],
      ),
    );
  }

  static Widget _careerStat(IconData icon, String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: const Color(0xFF818CF8), size: 18),
            const SizedBox(height: 6),
            Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
            const SizedBox(height: 2),
            Text(label, textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 9, color: Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ALUMNI NETWORKING
// ═══════════════════════════════════════════════════════════════════════════

class _AlumniNetworkSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('JEJARING ALUMNI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.0, color: AppColors.primary)),
          const SizedBox(height: 6),
          const Text('Bangun Jejaring Alumni yang Bermakna',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
          const SizedBox(height: 6),
          const Text('Alumni dapat menemukan, terhubung, dan berjejaring — tanpa fitur chat yang ribet.',
            style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.5)),
          const SizedBox(height: 16),
          // Feature chips
          ..._networkFeatures.map((f) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Container(width: 32, height: 32, decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(9)),
                    child: Icon(f.$1, color: AppColors.primary, size: 16)),
                  const SizedBox(width: 10),
                  Expanded(child: Text(f.$2, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary))),
                ],
              ),
            ),
          )),
          const SizedBox(height: 12),
          // Directory mockup
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Alumni Directory', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                const SizedBox(height: 10),
                ..._directoryCards.map((a) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(10)),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 14,
                          backgroundColor: const Color(0xFF4F46E5).withValues(alpha: 0.3),
                          child: Text(a['name']![0], style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(a['name']!, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                              Text('${a['dept']} · ${a['year']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 9)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: a['status'] == 'connected' ? const Color(0xFF059669).withValues(alpha: 0.2) : const Color(0xFFD97706).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            a['status'] == 'connected' ? 'Terhubung' : 'Menunggu',
                            style: TextStyle(color: a['status'] == 'connected' ? const Color(0xFF34D399) : const Color(0xFFFBBF24), fontSize: 9, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

const _networkFeatures = [
  (Icons.search_rounded, 'Cari alumni berdasarkan jurusan & angkatan'),
  (Icons.location_on_outlined, 'Filter berdasarkan provinsi & kota'),
  (Icons.person_outline_rounded, 'Lihat profil publik alumni'),
  (Icons.link_rounded, 'Kirim & terima permintaan koneksi'),
  (Icons.shield_outlined, 'Blokir & laporkan pengguna'),
  (Icons.work_outline_rounded, 'Lihat detail karier alumni'),
];

const _directoryCards = [
  {'name': 'Siti Rahmawati', 'dept': 'Teknik Informatika', 'year': '2022', 'status': 'connected'},
  {'name': 'Budi Santoso', 'dept': 'Manajemen Bisnis', 'year': '2021', 'status': 'pending'},
  {'name': 'Dewi Anggraini', 'dept': 'Sistem Informasi', 'year': '2023', 'status': 'none'},
];

// ═══════════════════════════════════════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════════════════════════════════════

class _FaqSection extends StatefulWidget {
  @override
  State<_FaqSection> createState() => _FaqSectionState();
}

class _FaqSectionState extends State<_FaqSection> {
  int _open = 0;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('FAQ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.0, color: AppColors.primary)),
          const SizedBox(height: 12),
          ..._faqs.asMap().entries.map((entry) {
            final i = entry.key;
            final faq = entry.value;
            final isOpen = _open == i;
            return GestureDetector(
              onTap: () => setState(() => _open = isOpen ? -1 : i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isOpen ? AppColors.primaryLight : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isOpen ? AppColors.primary.withValues(alpha: 0.2) : AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(faq.$1,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: isOpen ? AppColors.primary : AppColors.textPrimary))),
                        Icon(isOpen ? Icons.remove_rounded : Icons.add_rounded,
                          color: isOpen ? AppColors.primary : AppColors.textMuted, size: 20),
                      ],
                    ),
                    AnimatedCrossFade(
                      firstChild: const SizedBox.shrink(),
                      secondChild: Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: Text(faq.$2, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.5)),
                      ),
                      crossFadeState: isOpen ? CrossFadeState.showSecond : CrossFadeState.showFirst,
                      duration: const Duration(milliseconds: 200),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

const _faqs = [
  ('Apa itu TracerConnect?',
    'Platform tracer study & alumni engagement untuk sekolah, kampus, dan lembaga pendidikan — dari data alumni hingga laporan akhir.'),
  ('Siapa yang bisa pakai?',
    'SMK, SMA, universitas, politeknik, dan lembaga pendidikan. Setiap institusi memiliki data yang terisolasi aman.'),
  ('Apakah kuisioner bisa dibuat sendiri?',
    'Ya! Builder drag-and-drop dengan berbagai tipe pertanyaan, section, dan logika kondisional — tanpa coding.'),
  ('Apakah bisa di-deploy ke shared hosting?',
    'Ya. Tanpa VPS, Docker, atau Redis. Kompatibel dengan shared hosting standar.'),
  ('Apakah alumni perlu install aplikasi?',
    'Tidak wajib. Alumni bisa isi dari aplikasi mobile atau tautan web — sesuai kenyamanan mereka.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// CTA
// ═══════════════════════════════════════════════════════════════════════════

class _CtaSection extends StatelessWidget {
  final VoidCallback onLogin;
  final VoidCallback onRegister;
  const _CtaSection({required this.onLogin, required this.onRegister});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primary, AppColors.primaryDark],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.school_rounded, color: Colors.white, size: 26),
          ),
          const SizedBox(height: 16),
          const Text(
            'Siap Merapikan Tracer Study?',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
          ),
          const SizedBox(height: 8),
          const Text(
            'Bergabung dengan institusi lain yang telah meningkatkan response rate & kualitas data alumni.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: Color(0xFFCBD5F5), height: 1.5),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: onRegister,
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
              child: const Text('Mulai Gratis'),
            ),
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: onLogin,
            child: const Text('Sudah punya akun? Masuk', style: TextStyle(color: Colors.white70, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════════════

class _Footer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          const Icon(Icons.school_rounded, color: AppColors.primary, size: 28),
          const SizedBox(height: 8),
          const Text('TracerConnect', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 4),
          const Text(
            'Digital Alumni Intelligence Platform',
            style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 12),
          const Text(
            '© 2026 TracerConnect. Semua hak dilindungi.',
            style: TextStyle(fontSize: 10, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}
