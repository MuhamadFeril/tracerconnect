import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'success_stories_providers.dart';

class SuccessStoryDetailPage extends ConsumerWidget {
  final String id;
  const SuccessStoryDetailPage({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final story = ref.watch(successStoryDetailProvider(id));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: story.when(
        loading: () => const LoadingView(label: 'Memuat kisah sukses…'),
        error: (e, _) => ErrorView(
          message: 'Kisah sukses tidak ditemukan.',
          onRetry: () => ref.invalidate(successStoryDetailProvider(id)),
        ),
        data: (s) {
          final tone = _categoryTone(s.category);

          return CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // ── Collapsing app bar + cover ──
              SliverAppBar(
                expandedHeight: 220,
                pinned: true,
                backgroundColor: tone.$2,
                leading: GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Container(
                    margin: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.arrow_back_rounded,
                        color: Colors.white, size: 20),
                  ),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  background: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [tone.$1, tone.$2],
                      ),
                    ),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        // Decorative circles
                        Positioned(
                          top: -40,
                          right: -40,
                          child: Container(
                            width: 160,
                            height: 160,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.06),
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: -20,
                          left: -20,
                          child: Container(
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.04),
                            ),
                          ),
                        ),
                        // Category badge
                        Positioned(
                          top: MediaQuery.of(context).padding.top + 56,
                          left: 20,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 5),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.22),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              s.categoryLabel,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                        // Icon
                        const Positioned(
                          bottom: 20,
                          right: 20,
                          child: Icon(Icons.auto_awesome_outlined,
                              color: Colors.white24, size: 44),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // ── Content ──
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title
                      Text(
                        s.title,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.4,
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Alumni info card
                      if (s.alumni != null)
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: tone.$1.withValues(alpha: 0.06),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                                color: tone.$1.withValues(alpha: 0.15)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [tone.$1, tone.$2],
                                  ),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.person_rounded,
                                    color: Colors.white, size: 22),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      s.alumni!.name,
                                      style: const TextStyle(
                                        color: AppColors.textPrimary,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      [
                                        if (s.alumni!.department != null)
                                          s.alumni!.department!,
                                        if (s.alumni!.graduationYear != null)
                                          'Angkatan ${s.alumni!.graduationYear}',
                                      ].join(' · '),
                                      style: const TextStyle(
                                        color: AppColors.textMuted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),

                      const SizedBox(height: 12),

                      // Published date
                      if (s.publishedAt != null)
                        Row(
                          children: [
                            const Icon(Icons.schedule_outlined,
                                size: 14, color: AppColors.textMuted),
                            const SizedBox(width: 6),
                            Text(
                              'Dipublikasikan ${Formatters.formatDateFromString(s.publishedAt)}',
                              style: const TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),

                      const SizedBox(height: 20),
                      const Divider(color: AppColors.border, height: 1),
                      const SizedBox(height: 20),

                      // Content
                      Text(
                        s.content,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 15,
                          height: 1.7,
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Back button
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () => context.push('/success-stories'),
                          icon: const Icon(Icons.arrow_back_rounded, size: 18),
                          label: const Text('Kembali ke daftar'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

(Color, Color) _categoryTone(String category) {
  switch (category) {
    case 'career':
      return (const Color(0xFF38BDF8), const Color(0xFF0284C7));
    case 'study':
      return (const Color(0xFF34D399), const Color(0xFF059669));
    case 'entrepreneur':
      return (const Color(0xFFFBBF24), const Color(0xFFD97706));
    case 'achievement':
      return (const Color(0xFFA78BFA), const Color(0xFF7C3AED));
    default:
      return (const Color(0xFF94A3B8), const Color(0xFF64748B));
  }
}
