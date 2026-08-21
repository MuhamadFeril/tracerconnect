import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/success_story.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'success_stories_providers.dart';

class SuccessStoriesPage extends ConsumerWidget {
  const SuccessStoriesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stories = ref.watch(successStoriesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Kisah Sukses Alumni')),
      body: stories.when(
        loading: () => const LoadingView(label: 'Memuat kisah sukses…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat kisah sukses.',
          onRetry: () => ref.invalidate(successStoriesProvider),
        ),
        data: (items) {
          if (items.isEmpty) {
            return const EmptyView(
              title: 'Belum ada kisah sukses',
              description: 'Institusi Anda belum membagikan kisah sukses alumni.',
              icon: Icons.auto_awesome_outlined,
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(successStoriesProvider);
              await ref.read(successStoriesProvider.future);
            },
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) =>
                  _StoryCard(story: items[index]),
            ),
          );
        },
      ),
    );
  }
}

class _StoryCard extends StatelessWidget {
  final SuccessStory story;
  const _StoryCard({required this.story});

  @override
  Widget build(BuildContext context) {
    final categoryTone = _categoryTone(story.category);

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => context.push('/success-stories/${story.id}'),
      child: Container(
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cover image or gradient placeholder
            Container(
              height: 140,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(16)),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [categoryTone.$1, categoryTone.$2],
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    top: 12,
                    left: 12,
                    child: AppBadge(
                      label: story.categoryLabel,
                      tone: BadgeTone.navy,
                    ),
                  ),
                  const Positioned(
                    bottom: 12,
                    right: 12,
                    child: Icon(
                      Icons.auto_awesome_outlined,
                      color: Colors.white38,
                      size: 32,
                    ),
                  ),
                ],
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(14),
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
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (story.content.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      story.content,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      if (story.publishedAt != null) ...[
                        const Icon(Icons.calendar_today_outlined,
                            size: 12, color: AppColors.textMuted),
                        const SizedBox(width: 4),
                        Text(
                          Formatters.formatDateFromString(story.publishedAt),
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 11),
                        ),
                      ],
                      const Spacer(),
                      if (story.alumni?.name != null)
                        Text(
                          story.alumni!.name,
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
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
      return (const Color(0xFF38BDF8), const Color(0xFF0284C7)); // sky
    case 'study':
      return (const Color(0xFF34D399), const Color(0xFF059669)); // emerald
    case 'entrepreneur':
      return (const Color(0xFFFBBF24), const Color(0xFFD97706)); // amber
    case 'achievement':
      return (const Color(0xFFA78BFA), const Color(0xFF7C3AED)); // violet
    default:
      return (const Color(0xFF94A3B8), const Color(0xFF64748B)); // slate
  }
}
