import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../shared/widgets/app_badge.dart';
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
      appBar: AppBar(title: const Text('Kisah Sukses')),
      body: story.when(
        loading: () => const LoadingView(label: 'Memuat kisah sukses…'),
        error: (e, _) => ErrorView(
          message: 'Kisah sukses tidak ditemukan.',
          onRetry: () => ref.invalidate(successStoryDetailProvider(id)),
        ),
        data: (s) {
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              // Cover
              Container(
                height: 180,
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: _categoryColors(s.category),
                  ),
                ),
                child: Stack(
                  children: [
                    Positioned(
                      top: 14,
                      left: 14,
                      child: AppBadge(
                        label: s.categoryLabel,
                        tone: BadgeTone.navy,
                      ),
                    ),
                    const Positioned(
                      bottom: 14,
                      right: 14,
                      child: Icon(
                        Icons.auto_awesome_outlined,
                        color: Colors.white38,
                        size: 40,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Title
              Text(
                s.title,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 10),

              // Meta
              Row(
                children: [
                  if (s.publishedAt != null) ...[
                    const Icon(Icons.calendar_today_outlined,
                        size: 13, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      'Dipublikasikan ${Formatters.formatDateFromString(s.publishedAt)}',
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 12),
                    ),
                  ],
                ],
              ),
              if (s.alumni != null) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.school_outlined,
                        size: 13, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      [
                        s.alumni!.name,
                        if (s.alumni!.department != null) s.alumni!.department!,
                        if (s.alumni!.graduationYear != null)
                          'Angkatan ${s.alumni!.graduationYear}',
                      ].join(' · '),
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ],

              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 12),

              // Content
              Text(
                s.content,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 14.5,
                  height: 1.65,
                ),
              ),

              const SizedBox(height: 24),

              // Back button
              Center(
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/success-stories'),
                  icon: const Icon(Icons.arrow_back_rounded, size: 18),
                  label: const Text('Kembali ke daftar'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

List<Color> _categoryColors(String category) {
  switch (category) {
    case 'career':
      return [const Color(0xFF38BDF8), const Color(0xFF0284C7)];
    case 'study':
      return [const Color(0xFF34D399), const Color(0xFF059669)];
    case 'entrepreneur':
      return [const Color(0xFFFBBF24), const Color(0xFFD97706)];
    case 'achievement':
      return [const Color(0xFFA78BFA), const Color(0xFF7C3AED)];
    default:
      return [const Color(0xFF94A3B8), const Color(0xFF64748B)];
  }
}
