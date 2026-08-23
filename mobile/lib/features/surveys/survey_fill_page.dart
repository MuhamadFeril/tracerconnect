import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/survey.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'question_input.dart';
import 'survey_answer_summary.dart';
import 'survey_repository.dart';

/// Halaman mengisi survey.
///
/// - `surveyId`: mulai/lanjutkan survey (mode isi).
/// - `responseId`: lihat respons sendiri (mode read-only).
class SurveyFillPage extends StatefulWidget {
  final String? surveyId;
  final String? responseId;

  const SurveyFillPage({super.key, this.surveyId, this.responseId});

  @override
  State<SurveyFillPage> createState() => _SurveyFillPageState();
}

class _SurveyFillPageState extends State<SurveyFillPage> {
  final _repo = SurveyRepository();
  final Map<String, TextEditingController> _controllers = {};
  final Set<String> _listened = {};

  SurveyFill? _fill;
  Map<String, dynamic> _answers = {};
  bool _loading = true;
  bool _saving = false;
  bool _submitting = false;
  String? _loadError;
  String? _topError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final fill = widget.responseId != null
          ? await _repo.showResponse(widget.responseId!)
          : await _repo.start(widget.surveyId!);
      if (!mounted) return;
      _applyFill(fill);
    } on ApiException catch (e) {
      if (!mounted) return;
      // Survey sudah dikumpulkan sebelumnya → tampilkan ringkasan jawaban.
      final message = e.message.toLowerCase();
      if (message.contains('sudah mengisi') && widget.surveyId != null) {
        await _loadSubmittedHistory(widget.surveyId!);
        return;
      }
      setState(() {
        _loading = false;
        _loadError = firstValidationMessage(e);
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = 'Terjadi kesalahan saat memuat survey.';
      });
    }
  }

  Future<void> _loadSubmittedHistory(String surveyId) async {
    try {
      final page = await _repo.myResponses(page: 1, perPage: 100);
      final response = page.items.where((r) => r.surveyId == surveyId).firstOrNull;
      if (response == null) {
        setState(() {
          _loading = false;
          _loadError = 'Anda sudah mengisi survey ini.';
        });
        return;
      }
      final fill = await _repo.showResponse(response.id);
      if (!mounted) return;
      _applyFill(fill);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = 'Anda sudah mengisi survey ini.';
      });
    }
  }

  void _applyFill(SurveyFill fill) {
    final textTypes = <String>{
      'short_text', 'long_text', 'textarea', 'number', 'year', 'file',
      'salary_range', 'location',
    };
    setState(() {
      _fill = fill;
      _answers = Map<String, dynamic>.from(fill.answers);
      _loadError = null;
      _loading = false;
      _topError = null;
    });

    for (final question in fill.survey.allQuestions) {
      if (!textTypes.contains(question.type)) continue;
      final controller = _controllers[question.id] ??= TextEditingController();
      controller.text = _answers[question.id]?.toString() ?? '';
      if (_listened.add(question.id)) {
        controller.addListener(() {
          _answers[question.id] = controller.text;
          if (mounted) setState(() {});
        });
      }
    }
  }

  void _setAnswer(String questionId, dynamic value) {
    setState(() {
      _answers[questionId] = value;
      _topError = null;
    });
  }

  List<Question> get _visibleQuestions {
    final fill = _fill;
    if (fill == null) return const [];
    return fill.survey.allQuestions
        .where((q) => isQuestionVisible(q, _answers))
        .toList();
  }

  int get _answeredCount =>
      _visibleQuestions.where((q) => !isEmptyAnswer(_answers[q.id])).length;

  int get _progress {
    final total = _visibleQuestions.length;
    if (total == 0) return 0;
    return ((_answeredCount / total) * 100).round();
  }

  Future<void> _saveDraft() async {
    final fill = _fill;
    if (fill == null) return;
    setState(() {
      _saving = true;
      _topError = null;
    });
    try {
      final saved = await _repo.save(fill.surveyId, _answers);
      if (!mounted) return;
      _applyFill(saved);
      _showSnack('Draft jawaban berhasil disimpan');
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _topError = firstValidationMessage(e));
    } catch (_) {
      if (!mounted) return;
      setState(() => _topError = 'Gagal menyimpan draft. Coba lagi.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  /// Dialog konfirmasi sebelum mengumpulkan jawaban.
  Future<void> _confirmAndSubmit() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Kumpulkan Jawaban'),
        content: const Text(
          'Setelah dikumpulkan, jawaban tidak dapat diubah lagi. Lanjutkan?',
          style: TextStyle(fontSize: 14, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Ya, Kumpulkan'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await _submit();
  }

  Future<void> _submit() async {
    final fill = _fill;
    if (fill == null) return;
    setState(() {
      _submitting = true;
      _topError = null;
    });
    try {
      final submitted = await _repo.submit(fill.surveyId, _answers);
      if (!mounted) return;
      _applyFill(submitted);
      _showSnack('Respons berhasil dikirim. Terima kasih! 🎉');
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _topError = firstValidationMessage(e));
    } catch (_) {
      if (!mounted) return;
      setState(() => _topError = 'Gagal mengumpulkan jawaban. Coba lagi.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Kuisioner')),
        body: const LoadingView(label: 'Menyiapkan kuisioner…'),
      );
    }

    final fill = _fill;
    if (fill == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Kuisioner')),
        body: ErrorView(
          message: _loadError ?? 'Kuisioner tidak ditemukan.',
          onRetry: _load,
        ),
      );
    }

    if (fill.isSubmitted) {
      return _SubmittedView(fill: fill, onBack: () => context.pop());
    }

    final visible = _visibleQuestions;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          fill.survey.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Header progres
            Container(
              width: double.infinity,
              color: AppColors.surface,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Progres',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        '$_answeredCount/${visible.length} ($_progress%)',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: _progress / 100,
                      minHeight: 8,
                      backgroundColor: const Color(0xFFE2E8F0),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (fill.survey.description != null &&
                      fill.survey.description!.isNotEmpty) ...[
                    Text(
                      fill.survey.description!,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],
                  if (_topError != null) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.dangerBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded,
                              color: AppColors.danger, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _topError!,
                              style: const TextStyle(
                                color: AppColors.danger,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (visible.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Text(
                        'Survey ini belum memiliki pertanyaan yang tampil untuk Anda.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                      ),
                    )
                  else
                    _buildSections(fill.survey),
                  const SizedBox(height: 90),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: visible.isEmpty
          ? null
          : SafeArea(
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
                decoration: const BoxDecoration(
                  color: AppColors.surface,
                  border: Border(top: BorderSide(color: AppColors.border)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: (_saving || _submitting) ? null : _saveDraft,
                        icon: _saving
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.save_outlined, size: 18),
                        label: const Text('Simpan Draft'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: (_saving || _submitting) ? null : () {
                          // Check only required questions that are visible.
                          final missingRequired = visible
                              .where((q) => q.isRequired && isEmptyAnswer(_answers[q.id]))
                              .toList();
                          if (missingRequired.isNotEmpty) {
                            setState(() => _topError =
                                'Masih ada ${missingRequired.length} pertanyaan wajib yang belum dijawab.');
                            return;
                          }
                          _confirmAndSubmit();
                        },
                        icon: _submitting
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.send_rounded, size: 18),
                        label: const Text('Kumpulkan'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSections(SurveyDetail survey) {
    final children = <Widget>[];

    for (final section in survey.sections) {
      final questions = section.questions
          .where((q) => isQuestionVisible(q, _answers))
          .toList();
      if (questions.isEmpty) continue;

      children.add(
        Container(
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
              if (section.title != null && section.title!.isNotEmpty) ...[
                Text(
                  section.title!,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (section.description != null && section.description!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    section.description!,
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                  ),
                ],
                const SizedBox(height: 10),
                const Divider(),
                const SizedBox(height: 6),
              ],
              for (final question in questions) ...[
                _QuestionBlock(
                  question: question,
                  value: _answers[question.id],
                  controller: _controllers[question.id],
                  onChanged: (v) => _setAnswer(question.id, v),
                ),
                const SizedBox(height: 6),
              ],
            ],
          ),
        ),
      );
    }

    final unassigned = survey.questions
        .where((q) => isQuestionVisible(q, _answers))
        .toList();
    if (unassigned.isNotEmpty) {
      children.add(
        Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              for (final question in unassigned) ...[
                _QuestionBlock(
                  question: question,
                  value: _answers[question.id],
                  controller: _controllers[question.id],
                  onChanged: (v) => _setAnswer(question.id, v),
                ),
                const SizedBox(height: 6),
              ],
            ],
          ),
        ),
      );
    }

    return Column(children: children);
  }
}

class _QuestionBlock extends StatelessWidget {
  final Question question;
  final dynamic value;
  final TextEditingController? controller;
  final ValueChanged<dynamic> onChanged;

  const _QuestionBlock({
    required this.question,
    required this.value,
    this.controller,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(
          TextSpan(
            text: question.label,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
            children: [
              if (question.isRequired)
                const TextSpan(
                  text: ' *',
                  style: TextStyle(color: AppColors.danger),
                ),
            ],
          ),
        ),
        if (question.helpText != null && question.helpText!.isNotEmpty) ...[
          const SizedBox(height: 3),
          Text(
            question.helpText!,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
        ],
        const SizedBox(height: 10),
        QuestionField(
          question: question,
          value: value,
          controller: controller,
          onChanged: onChanged,
        ),
      ],
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

class _SubmittedView extends StatelessWidget {
  final SurveyFill fill;
  final VoidCallback onBack;

  const _SubmittedView({required this.fill, required this.onBack});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          fill.survey.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(
                      color: AppColors.successBg,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check_circle_outline_rounded,
                        color: AppColors.success, size: 34),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Terima kasih!',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Respons Anda untuk "${fill.survey.title}" telah berhasil dikirim'
                    '${fill.submittedAt != null ? ' pada ${Formatters.formatDateTimeFromString(fill.submittedAt)}' : ''}.'
                    ' Data Anda membantu institusi meningkatkan kualitas pembelajaran.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: onBack,
                          child: const Text('Kembali'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: () => context.pop(),
                          child: const Text('Ke Beranda'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: const Row(
                children: [
                  Icon(Icons.assignment_turned_in_outlined,
                      color: AppColors.success, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Ringkasan Jawaban Anda',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Text(
                    'hanya-baca',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 11),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SurveyAnswerSummary(fill: fill),
          ],
        ),
      ),
    );
  }
}
