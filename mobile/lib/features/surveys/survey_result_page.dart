import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/survey.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'survey_answer_summary.dart';
import 'survey_providers.dart';

class SurveyResultPage extends ConsumerStatefulWidget {
  final String responseId;
  const SurveyResultPage({super.key, required this.responseId});

  @override
  ConsumerState<SurveyResultPage> createState() => _SurveyResultPageState();
}

class _SurveyResultPageState extends ConsumerState<SurveyResultPage> {
  bool _editing = false;

  /// Apakah survey yang bersangkutan masih menerima jawaban (belum tutup).
  bool _isSurveyOpen(SurveyDetail survey) {
    final now = DateTime.now();
    final startsAt = survey.startsAt == null ? null : DateTime.tryParse(survey.startsAt!);
    final expiresAt = survey.expiresAt == null ? null : DateTime.tryParse(survey.expiresAt!);
    if (startsAt != null && startsAt.isAfter(now)) return false;
    if (expiresAt != null && !expiresAt.isAfter(now)) return false;
    return true;
  }

  Future<void> _editAnswers(SurveyFill fill) async {
    setState(() => _editing = true);
    try {
      await ref.read(surveyRepositoryProvider).edit(fill.surveyId);
      ref.invalidate(responseDetailProvider(widget.responseId));
      ref.invalidate(availableSurveysProvider);
      ref.invalidate(myResponsesProvider);
      if (!mounted) return;
      context.push('/survey/${fill.surveyId}');
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(firstValidationMessage(e))));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal membuka jawaban untuk diperbarui.')),
      );
    } finally {
      if (mounted) setState(() => _editing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final responseId = widget.responseId;
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
          final editable = fill.isSubmitted && _isSurveyOpen(fill.survey);
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

              // Kuisioner masih terbuka → alumni boleh memperbarui jawaban.
              if (editable) ...[
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _editing ? null : () => _editAnswers(fill),
                    icon: _editing
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.edit_outlined, size: 18),
                    label: const Text('Ubah Jawaban'),
                  ),
                ),
                const SizedBox(height: 12),
              ],

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
