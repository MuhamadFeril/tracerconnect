import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/success_story.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'success_stories_providers.dart';

/// Filter kategori kisah sukses.
const _categories = [
  ('all', 'Semua'),
  ('career', 'Karir'),
  ('study', 'Pendidikan'),
  ('entrepreneur', 'Wirausaha'),
  ('achievement', 'Prestasi'),
];

class SuccessStoriesPage extends ConsumerStatefulWidget {
  const SuccessStoriesPage({super.key});

  @override
  ConsumerState<SuccessStoriesPage> createState() => _SuccessStoriesPageState();
}

class _SuccessStoriesPageState extends ConsumerState<SuccessStoriesPage> {
  String _selectedCategory = 'all';

  @override
  Widget build(BuildContext context) {
    final storiesAsync = ref.watch(successStoriesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: storiesAsync.when(
        loading: () => const LoadingView(label: 'Memuat kisah sukses…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat kisah sukses.',
          onRetry: () => ref.invalidate(successStoriesProvider),
        ),
        data: (items) {
          final filtered = _selectedCategory == 'all'
              ? items
              : items
                  .where((s) => s.category == _selectedCategory)
                  .toList();

          return CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // ── Hero header ──
              SliverToBoxAdapter(
                child: _HeroHeader(storyCount: items.length),
              ),

              // ── Category filter chips ──
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: SizedBox(
                    height: 38,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _categories.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final (value, label) = _categories[index];
                        final selected = _selectedCategory == value;
                        final count = value == 'all'
                            ? items.length
                            : items.where((s) => s.category == value).length;
                        return FilterChip(
                          label: Text('$label ($count)'),
                          selected: selected,
                          onSelected: (_) =>
                              setState(() => _selectedCategory = value),
                          labelStyle: TextStyle(
                            fontSize: 12,
                            fontWeight:
                                selected ? FontWeight.w700 : FontWeight.w500,
                            color: selected
                                ? Colors.white
                                : AppColors.textSecondary,
                          ),
                          selectedColor: AppColors.primary,
                          checkmarkColor: Colors.white,
                          backgroundColor: AppColors.surface,
                          side: BorderSide(
                            color:
                                selected ? AppColors.primary : AppColors.border,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          materialTapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                          visualDensity: VisualDensity.compact,
                        );
                      },
                    ),
                  ),
                ),
              ),

              // ── Empty state ──
              if (filtered.isEmpty)
                const SliverFillRemaining(
                  child: EmptyView(
                    title: 'Tidak ada kisah sukses',
                    description: 'Belum ada kisah sukses di kategori ini.',
                    icon: Icons.auto_awesome_outlined,
                  ),
                ),

              // ── Story cards ──
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverList.separated(
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 14),
                  itemBuilder: (context, index) =>
                      _StoryCard(story: filtered[index]),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ─── Hero header ─────────────────────────────────────────────────────────────
class _HeroHeader extends StatelessWidget {
  final int storyCount;
  const _HeroHeader({required this.storyCount});

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(20, top + 16, 20, 28),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.violet, Color(0xFF6D28D9)],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Back button
          GestureDetector(
            onTap: () => Navigator.of(context).pop(),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.arrow_back_rounded,
                  color: Colors.white, size: 20),
            ),
          ),
          const SizedBox(height: 20),
          const Icon(Icons.auto_stories_outlined,
              color: Colors.white70, size: 32),
          const SizedBox(height: 10),
          const Text(
            'Kisah Sukses Alumni',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '$storyCount cerita inspiratif dari alumni',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.72),
              fontSize: 13.5,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Story card ──────────────────────────────────────────────────────────────
class _StoryCard extends StatelessWidget {
  final SuccessStory story;
  const _StoryCard({required this.story});

  @override
  Widget build(BuildContext context) {
    final tone = _categoryTone(story.category);
    final preview =
        story.content.length > 120
            ? '${story.content.substring(0, 120)}…'
            : story.content;

    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => context.push('/success-stories/${story.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: tone.$1.withValues(alpha: 0.10),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Cover area ──
            Container(
              height: 120,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(18)),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [tone.$1, tone.$2],
                ),
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Pattern overlay
                  DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(18)),
                      gradient: LinearGradient(
                        begin: Alignment.topRight,
                        end: Alignment.bottomLeft,
                        colors: [
                          Colors.white.withValues(alpha: 0.08),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                  // Icon
                  const Positioned(
                    bottom: 12,
                    right: 14,
                    child: Icon(Icons.auto_awesome_outlined,
                        color: Colors.white24, size: 36),
                  ),
                  // Category badge
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.22),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        story.categoryLabel,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── Content ──
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    story.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      height: 1.3,
                    ),
                  ),
                  if (preview.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      preview,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12.5,
                        height: 1.45,
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  // ── Footer ──
                  Row(
                    children: [
                      // Alumni info
                      if (story.alumni != null) ...[
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: tone.$1.withValues(alpha: 0.12),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.person_outline_rounded,
                              size: 14, color: tone.$1),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                story.alumni!.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              if (story.alumni!.department != null ||
                                  story.alumni!.graduationYear != null)
                                Text(
                                  [
                                    if (story.alumni!.department != null)
                                      story.alumni!.department!,
                                    if (story.alumni!.graduationYear != null)
                                      "'${story.alumni!.graduationYear.toString().substring(2)}",
                                  ].join(' · '),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: AppColors.textMuted,
                                    fontSize: 10.5,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                      // Date
                      if (story.publishedAt != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          Formatters.formatDateFromString(story.publishedAt),
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 10.5,
                          ),
                        ),
                      ],
                      // Arrow
                      const SizedBox(width: 6),
                      Icon(Icons.chevron_right_rounded,
                          color: tone.$1, size: 20),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Returns (gradient start, gradient end) based on category.
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
