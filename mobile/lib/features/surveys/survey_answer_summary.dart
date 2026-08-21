import 'package:flutter/material.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/survey.dart';
import '../../shared/widgets/app_badge.dart';
import 'question_input.dart';

/// Ringkasan jawaban read-only (survey tersubmit / respons yang sudah dikirim).
class SurveyAnswerSummary extends StatelessWidget {
  final SurveyFill fill;

  const SurveyAnswerSummary({super.key, required this.fill});

  @override
  Widget build(BuildContext context) {
    final answers = fill.answers;
    final sections = fill.survey.sections
        .map(
          (section) => (
            section: section,
            questions: section.questions
                .where((q) => isQuestionVisible(q, answers))
                .toList(),
          ),
        )
        .where((block) => block.questions.isNotEmpty)
        .toList();

    final unassigned = fill.survey.questions
        .where((q) => isQuestionVisible(q, answers))
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final block in sections) ...[
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (block.section.title != null && block.section.title!.isNotEmpty) ...[
                  Text(
                    block.section.title!,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (block.section.description != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      block.section.description!,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    ),
                  ],
                  const SizedBox(height: 10),
                  const Divider(),
                  const SizedBox(height: 4),
                ],
                for (final question in block.questions)
                  _AnswerRow(question: question, value: answers[question.id]),
              ],
            ),
          ),
        ],
        if (unassigned.isNotEmpty)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                for (final question in unassigned)
                  _AnswerRow(question: question, value: answers[question.id]),
              ],
            ),
          ),
      ],
    );
  }
}

class _AnswerRow extends StatelessWidget {
  final Question question;
  final dynamic value;

  const _AnswerRow({required this.question, required this.value});

  @override
  Widget build(BuildContext context) {
    final answered = !isEmptyAnswer(value);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  question.label,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              AppBadge(
                label: AppConstants.questionTypeLabel(question.type),
                tone: BadgeTone.navy,
              ),
            ],
          ),
          const SizedBox(height: 6),
          if (answered)
            Text(
              Formatters.formatAnswerValue(value),
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                height: 1.5,
              ),
            )
          else
            const Text(
              'Tidak dijawab',
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: 13,
                fontStyle: FontStyle.italic,
              ),
            ),
        ],
      ),
    );
  }
}
