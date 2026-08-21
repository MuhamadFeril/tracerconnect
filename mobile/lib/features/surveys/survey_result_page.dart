import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'survey_answer_summary.dart';
import 'survey_providers.dart';

class SurveyResultPage extends ConsumerWidget {
  final String responseId;
  const SurveyResultPage({super.key, required this.responseId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final responseAsync = ref.watch(responseDetailProvider(responseId));

    return Scaffold(
      appBar: AppBar(title: const Text('Hasil Kuisioner')),
      body: responseAsync.when(
        loading: () => const LoadingView(label: 'Memuat jawaban Anda…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat jawaban Anda.',
          onRetry: () =>
              ref.invalidate(responseDetailProvider(responseId)),
        ),
        data: (fill) {
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              // Header card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.check_circle_outline_rounded,
                          color: Color(0xFF059669), size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  fill.survey.title,
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              AppBadge(
                                label: fill.status == 'submitted'
                                    ? 'Terkirim'
                                    : 'Draft',
                                tone: fill.status == 'submitted'
                                    ? BadgeTone.green
                                    : BadgeTone.amber,
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Versi ${fill.version}'
                            '${fill.submittedAt != null ? ' · Dikirim ${Formatters.formatDateTimeFromString(fill.submittedAt)}' : ''}',
                            style: const TextStyle(
                                color: AppColors.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Answer summary (read-only)
              SurveyAnswerSummary(fill: fill),

              const SizedBox(height: 20),

              // Navigation buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.go('/surveys'),
                      icon: const Icon(Icons.arrow_back_rounded, size: 18),
                      label: const Text('Kembali ke Kuisioner'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => context.go('/home'),
                      icon: const Icon(Icons.home_rounded, size: 18),
                      label: const Text('Ke Beranda'),
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}
