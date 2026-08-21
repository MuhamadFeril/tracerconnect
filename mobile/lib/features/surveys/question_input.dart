import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../models/survey.dart';

/// Apakah pertanyaan tampil, mengikuti jawaban saat ini. Meniru logika
/// backend (ResponseService) dan web (isQuestionVisible).
bool isQuestionVisible(Question question, Map<String, dynamic> answers) {
  for (final condition in question.conditions) {
    final raw = answers[condition.conditionQuestionId];
    final trigger = raw is List ? raw.join(',') : (raw ?? '').toString();
    final matches = trigger == (condition.value ?? '').toString();
    if (condition.operator == 'not_equals') {
      if (matches) return false;
    } else {
      if (!matches) return false;
    }
  }
  return true;
}

bool isEmptyAnswer(dynamic value) {
  return value == null ||
      value == '' ||
      (value is List && value.isEmpty) ||
      value == false;
}

const _textTypes = {
  'short_text', 'long_text', 'textarea', 'number', 'file', 'salary_range', 'location',
};

bool isTextType(String type) => _textTypes.contains(type);

/// Input jawaban per tipe pertanyaan.
class QuestionField extends StatelessWidget {
  final Question question;
  final dynamic value;
  final TextEditingController? controller;
  final ValueChanged<dynamic> onChanged;

  const QuestionField({
    super.key,
    required this.question,
    required this.value,
    this.controller,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    switch (question.type) {
      case 'long_text':
      case 'textarea':
        return TextField(
          controller: controller,
          maxLines: 4,
          onChanged: (v) => onChanged(v),
          decoration: const InputDecoration(hintText: 'Tulis jawaban Anda…'),
        );
      case 'number':
        return TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          onChanged: (v) => onChanged(v),
          decoration: const InputDecoration(hintText: '0'),
        );
      case 'date':
        return _DateField(value: value?.toString(), onChanged: onChanged);
      case 'year':
        return TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          onChanged: (v) => onChanged(v),
          decoration: const InputDecoration(hintText: 'Tahun (contoh: 2024)'),
        );
      case 'dropdown':
        return _DropdownField(question: question, value: value, onChanged: onChanged);
      case 'single_choice':
      case 'yes_no':
        return _ChoiceField(
          question: question,
          value: value,
          multi: false,
          onChanged: onChanged,
        );
      case 'multiple_choice':
        return _ChoiceField(
          question: question,
          value: value,
          multi: true,
          onChanged: onChanged,
        );
      case 'boolean':
        return _ChoiceField(
          question: question,
          value: value,
          multi: false,
          onChanged: onChanged,
          boolean: true,
        );
      case 'rating':
      case 'scale':
        return _RatingField(question: question, value: value, onChanged: onChanged);
      case 'file':
        return TextField(
          controller: controller,
          onChanged: (v) => onChanged(v),
          decoration: const InputDecoration(
            hintText: 'Tempel tautan file atau tulis deskripsi singkat',
          ),
        );
      default:
        return TextField(
          controller: controller,
          onChanged: (v) => onChanged(v),
          decoration: const InputDecoration(hintText: 'Ketik jawaban Anda…'),
        );
    }
  }
}

class _DateField extends StatelessWidget {
  final String? value;
  final ValueChanged<dynamic> onChanged;

  const _DateField({required this.value, required this.onChanged});

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 5, now.month, now.day),
      firstDate: DateTime(1900),
      lastDate: now,
    );
    if (picked != null) {
      final formatted =
          '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      onChanged(formatted);
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => _pick(context),
      child: InputDecorator(
        decoration: const InputDecoration(
          hintText: 'Pilih tanggal',
          prefixIcon: Icon(Icons.calendar_today_outlined, size: 18),
        ),
        child: Text(
          value ?? '',
          style: TextStyle(
            fontSize: 14,
            color: value == null ? AppColors.textMuted : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}

class _DropdownField extends StatelessWidget {
  final Question question;
  final dynamic value;
  final ValueChanged<dynamic> onChanged;

  const _DropdownField({
    required this.question,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final options = question.options;
    return DropdownButtonFormField<String>(
      initialValue: value?.toString(),
      isExpanded: true,
      decoration: const InputDecoration(hintText: '— Pilih salah satu —'),
      items: [
        for (final option in options)
          DropdownMenuItem(
            value: option.effectiveValue,
            child: Text(option.label, overflow: TextOverflow.ellipsis),
          ),
      ],
      onChanged: (v) => onChanged(v),
    );
  }
}

class _ChoiceField extends StatelessWidget {
  final Question question;
  final dynamic value;
  final bool multi;
  final bool boolean;
  final ValueChanged<dynamic> onChanged;

  const _ChoiceField({
    required this.question,
    required this.value,
    required this.multi,
    required this.onChanged,
    this.boolean = false,
  });

  @override
  Widget build(BuildContext context) {
    final options = boolean
        ? const [
            QuestionOption(label: 'Ya', value: 'yes'),
            QuestionOption(label: 'Tidak', value: 'no'),
          ]
        : question.options;
    final selected = multi
        ? ((value is List) ? value.map((e) => e.toString()).toList() : <String>[])
        : value?.toString();

    return Column(
      children: [
        for (final option in options)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () {
                if (multi) {
                  final current = Set<String>.from(selected);
                  if (current.contains(option.effectiveValue)) {
                    current.remove(option.effectiveValue);
                  } else {
                    current.add(option.effectiveValue);
                  }
                  onChanged(current.toList());
                } else {
                  onChanged(option.effectiveValue);
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: multi
                      ? ((selected as List).contains(option.effectiveValue)
                          ? AppColors.primaryLight
                          : AppColors.surface)
                      : (selected == option.effectiveValue
                          ? AppColors.primaryLight
                          : AppColors.surface),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: multi
                        ? ((selected as List).contains(option.effectiveValue)
                            ? AppColors.primary
                            : AppColors.border)
                        : (selected == option.effectiveValue
                            ? AppColors.primary
                            : AppColors.border),
                    width: multi
                        ? ((selected as List).contains(option.effectiveValue)
                            ? 1.6
                            : 1)
                        : (selected == option.effectiveValue ? 1.6 : 1),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      multi
                          ? ((selected as List).contains(option.effectiveValue)
                              ? Icons.check_box_rounded
                              : Icons.check_box_outline_blank_rounded)
                          : (selected == option.effectiveValue
                              ? Icons.radio_button_checked_rounded
                              : Icons.radio_button_off_rounded),
                      size: 20,
                      color: (multi
                              ? (selected as List).contains(option.effectiveValue)
                              : selected == option.effectiveValue)
                          ? AppColors.primary
                          : AppColors.textMuted,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        option.label,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _RatingField extends StatelessWidget {
  final Question question;
  final dynamic value;
  final ValueChanged<dynamic> onChanged;

  const _RatingField({
    required this.question,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final max = question.ratingMax;
    final current = (value is num) ? value.toInt() : (int.tryParse(value?.toString() ?? '') ?? 0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            for (var n = 1; n <= max; n++)
              Padding(
                padding: const EdgeInsets.only(right: 6),
                child: IconButton(
                  onPressed: () => onChanged(n),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  iconSize: 30,
                  icon: Icon(
                    n <= current ? Icons.star_rounded : Icons.star_border_rounded,
                    color: n <= current ? const Color(0xFFF59E0B) : AppColors.textMuted,
                  ),
                ),
              ),
          ],
        ),
        Text(
          current > 0 ? '$current dari $max' : 'Pilih nilai',
          style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
        ),
      ],
    );
  }
}
