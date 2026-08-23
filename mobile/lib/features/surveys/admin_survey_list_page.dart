import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/survey.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'admin_survey_providers.dart';

class AdminSurveyListPage extends ConsumerStatefulWidget {
  const AdminSurveyListPage({super.key});

  @override
  ConsumerState<AdminSurveyListPage> createState() => _AdminSurveyListPageState();
}

class _AdminSurveyListPageState extends ConsumerState<AdminSurveyListPage> {
  String _search = '';
  String? _statusFilter;

  @override
  Widget build(BuildContext context) {
    final surveys = ref.watch(adminSurveysProvider(
      (search: _search.isEmpty ? null : _search, status: _statusFilter),
    ));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kelola Kuisioner'),
        actions: [
          IconButton(
            onPressed: () => _showCreateDialog(),
            icon: const Icon(Icons.add_rounded),
            tooltip: 'Buat Kuisioner',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & filter bar
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Cari kuisioner…',
                      prefixIcon: const Icon(Icons.search_rounded, size: 20),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                    onChanged: (v) => setState(() => _search = v),
                  ),
                ),
                const SizedBox(width: 8),
                PopupMenuButton<String?>(
                  icon: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.filter_list_rounded,
                          size: 18,
                          color: _statusFilter != null ? AppColors.primary : AppColors.textMuted,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _statusFilter == null
                              ? 'Semua'
                              : (_statusFilter == 'published' ? 'Aktif' : 'Draft'),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _statusFilter != null ? AppColors.primary : AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  onSelected: (v) => setState(() => _statusFilter = v),
                  itemBuilder: (_) => [
                    const PopupMenuItem(value: null, child: Text('Semua Status')),
                    const PopupMenuItem(value: 'draft', child: Text('Draft')),
                    const PopupMenuItem(value: 'published', child: Text('Aktif / Dipublikasikan')),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: surveys.when(
              loading: () => const LoadingView(label: 'Memuat kuisioner…'),
              error: (e, _) => ErrorView(
                message: 'Gagal memuat daftar kuisioner.',
                onRetry: () => ref.invalidate(adminSurveysProvider),
              ),
              data: (page) {
                if (page.items.isEmpty) {
                  return const EmptyView(
                    title: 'Belum ada kuisioner',
                    description: 'Buat kuisioner baru dengan tombol + di pojok kanan atas.',
                    icon: Icons.assignment_outlined,
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(adminSurveysProvider);
                  },
                  child: ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: page.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) =>
                        _SurveyCard(item: page.items[index]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showCreateDialog() {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Buat Kuisioner Baru'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: titleCtrl,
                decoration: const InputDecoration(
                  labelText: 'Judul *',
                  hintText: 'Contoh: Tracer Study 2026',
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Judul wajib diisi' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: descCtrl,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Deskripsi (opsional)',
                  hintText: 'Deskripsi singkat kuisioner',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              Navigator.of(ctx).pop();
              await _createSurvey(titleCtrl.text.trim(), descCtrl.text.trim());
            },
            child: const Text('Buat'),
          ),
        ],
      ),
    );
  }

  Future<void> _createSurvey(String title, String description) async {
    try {
      final repo = ref.read(adminSurveyRepositoryProvider);
      final item = await repo.create(
        title: title,
        description: description.isNotEmpty ? description : null,
      );
      if (!mounted) return;
      ref.invalidate(adminSurveysProvider);
      // Navigate to detail page for the new survey
      context.push('/admin-surveys/${item.id}');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kuisioner berhasil dibuat')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(firstValidationMessage(e))),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal membuat kuisioner')),
      );
    }
  }
}

// ─── Survey Card ──────────────────────────────────────────────────────────────

class _SurveyCard extends ConsumerWidget {
  final AdminSurveyItem item;
  const _SurveyCard({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/admin-surveys/${item.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  _StatusChip(status: item.status),
                ],
              ),
              if (item.description != null && item.description!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  item.description!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(Icons.help_outline_rounded, size: 15, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text(
                    '${item.questionsCount} pertanyaan',
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
                  const SizedBox(width: 12),
                  Icon(Icons.view_module_outlined, size: 15, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text(
                    '${item.sectionsCount} bagian',
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
                  const Spacer(),
                  if (item.createdAt != null)
                    Text(
                      Formatters.formatDateFromString(item.createdAt),
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              // Quick actions
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.push('/admin-surveys/${item.id}'),
                      icon: const Icon(Icons.edit_outlined, size: 16),
                      label: const Text('Kelola'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => _togglePublish(context, ref),
                      icon: Icon(
                        item.isPublished ? Icons.unpublished_outlined : Icons.publish_rounded,
                        size: 16,
                      ),
                      label: Text(item.isPublished ? 'Unpublish' : 'Publish'),
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        backgroundColor: item.isPublished ? AppColors.warning : AppColors.success,
                        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _togglePublish(BuildContext context, WidgetRef ref) async {
    try {
      final repo = ref.read(adminSurveyRepositoryProvider);
      if (item.isPublished) {
        await repo.unpublish(item.id);
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Kuisioner dikembalikan ke draft')),
        );
      } else {
        await repo.publish(item.id);
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Kuisioner berhasil dipublikasikan')),
        );
      }
      ref.invalidate(adminSurveysProvider);
    } on ApiException catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(firstValidationMessage(e))),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengubah status kuisioner')),
      );
    }
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final isPublished = status == 'published';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isPublished ? AppColors.successBg : AppColors.warningBg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        isPublished ? 'Aktif' : 'Draft',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: isPublished ? AppColors.success : AppColors.warning,
        ),
      ),
    );
  }
}
