import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_constants.dart';
import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/survey.dart';
import '../../models/survey_response.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'survey_providers.dart';

class SurveysPage extends ConsumerWidget {
  const SurveysPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Dukungan extra {'tab': 'history'} dari riwayat di beranda.
    final extra = GoRouterState.of(context).extra;
    final initialTab = (extra is Map && extra['tab'] == 'history') ? 1 : 0;

    return DefaultTabController(
      length: 2,
      initialIndex: initialTab,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Kuisioner'),
          bottom: const TabBar(
            labelColor: AppColors.primary,
            indicatorColor: AppColors.primary,
            unselectedLabelColor: AppColors.textMuted,
            tabs: [
              Tab(text: 'Tersedia'),
              Tab(text: 'Riwayat'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _AvailableSurveysTab(),
            _HistoryTab(),
          ],
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------------
// Tab Tersedia
// ----------------------------------------------------------------------
class _AvailableSurveysTab extends ConsumerWidget {
  const _AvailableSurveysTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final surveys = ref.watch(availableSurveysProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(availableSurveysProvider);
        await ref.read(availableSurveysProvider.future);
      },
      child: surveys.when(
        loading: () => const LoadingView(label: 'Memuat kuisioner…'),
        error: (e, _) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 120),
            ErrorView(message: 'Gagal memuat daftar kuisioner.'),
          ],
        ),
        data: (items) {
          if (items.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 120),
                EmptyView(
                  title: 'Belum ada kuisioner',
                  description: 'Kuisioner tracer study dari institusi Anda akan muncul di sini.',
                  icon: Icons.assignment_outlined,
                ),
              ],
            );
          }
          return ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) => _SurveyCard(item: items[index]),
          );
        },
      ),
    );
  }
}

class _SurveyCard extends ConsumerStatefulWidget {
  final SurveyItem item;

  const _SurveyCard({required this.item});

  @override
  ConsumerState<_SurveyCard> createState() => _SurveyCardState();
}

class _SurveyCardState extends ConsumerState<_SurveyCard> {
  bool _editing = false;

  Future<void> _updateAnswers() async {
    setState(() => _editing = true);
    try {
      await ref.read(surveyRepositoryProvider).edit(widget.item.id);
      ref.invalidate(availableSurveysProvider);
      ref.invalidate(myResponsesProvider);
      if (!mounted) return;
      context.push('/survey/${widget.item.id}');
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
    final item = widget.item;
    final status = item.responseStatus ?? 'not_started';
    final isDone = status == 'submitted';
    final isInProgress = status == 'in_progress';
    final completion = item.completion ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  item.title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              AppBadge(
                label: AppConstants.surveyItemStatusLabel(status),
                tone: isDone
                    ? BadgeTone.green
                    : (isInProgress ? BadgeTone.amber : BadgeTone.navy),
              ),
            ],
          ),
          if (item.description != null && item.description!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              item.description!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.help_outline_rounded, size: 15, color: AppColors.textMuted),
              const SizedBox(width: 5),
              Text(
                '${item.questionsCount} pertanyaan',
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
              ),
              if (item.expiresAt != null) ...[
                const SizedBox(width: 14),
                const Icon(Icons.event_outlined, size: 15, color: AppColors.textMuted),
                const SizedBox(width: 5),
                Expanded(
                  child: Text(
                    'Tutup ${Formatters.formatDateFromString(item.expiresAt)}',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
                ),
              ],
            ],
          ),
          if (isInProgress || isDone) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: completion / 100,
                      minHeight: 6,
                      backgroundColor: const Color(0xFFE2E8F0),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  '$completion%',
                  style: TextStyle(
                    color: isDone ? AppColors.success : AppColors.warning,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 14),
          if (isDone)
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                // Kuisioner masih terbuka (daftar hanya menampilkan survey
                // yang aktif): alumni bisa memperbarui jawaban yang terkirim.
                OutlinedButton(
                  onPressed: _editing ? null : _updateAnswers,
                  child: _editing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Perbarui'),
                ),
                const SizedBox(width: 10),
                FilledButton(
                  onPressed: () => context.push(
                    '/response/${item.responseId}',
                  ),
                  child: const Text('Lihat Jawaban'),
                ),
              ],
            )
          else
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton(
                onPressed: () => context.push('/survey/${item.id}'),
                child: Text(isInProgress ? 'Lanjutkan' : 'Mulai'),
              ),
            ),
        ],
      ),
    );
  }
}

// ----------------------------------------------------------------------
// Tab Riwayat
// ----------------------------------------------------------------------
class _HistoryTab extends ConsumerWidget {
  const _HistoryTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final responses = ref.watch(myResponsesProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(myResponsesProvider);
        await ref.read(myResponsesProvider.future);
      },
      child: responses.when(
        loading: () => const LoadingView(label: 'Memuat riwayat…'),
        error: (e, _) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 120),
            ErrorView(message: 'Gagal memuat riwayat respons.'),
          ],
        ),
        data: (page) {
          final items = page.items;
          if (items.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 120),
                EmptyView(
                  title: 'Belum ada respons',
                  description: 'Riwayat pengisian tracer study akan muncul di sini.',
                  icon: Icons.history_rounded,
                ),
              ],
            );
          }
          return ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) =>
                _HistoryRow(item: items[index]),
          );
        },
      ),
    );
  }
}

class _HistoryRow extends StatelessWidget {
  final SurveyResponseItem item;

  const _HistoryRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final isSubmitted = item.status == 'submitted';

    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () {
        if (isSubmitted) {
          context.push('/response/${item.id}');
        } else if (item.surveyId != null) {
          context.push('/survey/${item.surveyId}');
        }
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: isSubmitted
                    ? AppColors.successBg
                    : AppColors.warningBg,
                borderRadius: BorderRadius.circular(11),
              ),
              child: Icon(
                isSubmitted
                    ? Icons.assignment_turned_in_outlined
                    : Icons.edit_note_rounded,
                color: isSubmitted ? AppColors.success : AppColors.warning,
                size: 21,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.surveyTitle ?? 'Survey',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    item.submittedAt != null
                        ? 'Selesai ${Formatters.formatDateTimeFromString(item.submittedAt)}'
                        : 'Dimulai ${Formatters.formatDateTimeFromString(item.startedAt)}',
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
            if (item.completion != null) ...[
              Text(
                '${item.completion}%',
                style: TextStyle(
                  color: isSubmitted ? AppColors.success : AppColors.warning,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 10),
            ],
            AppBadge(
              label: AppConstants.responseStatusLabel(item.status),
              tone: isSubmitted ? BadgeTone.green : BadgeTone.amber,
            ),
          ],
        ),
      ),
    );
  }
}
