import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/job_vacancy.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'jobs_providers.dart';

class JobsPage extends ConsumerStatefulWidget {
  const JobsPage({super.key});

  @override
  ConsumerState<JobsPage> createState() => _JobsPageState();
}

class _JobsPageState extends ConsumerState<JobsPage> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  String _search = '';
  int _page = 1;
  bool _loadingMore = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  void _loadMore() {
    final current = ref.read(jobsProvider((search: _search, page: _page)));
    if (_loadingMore || current.valueOrNull == null || !current.valueOrNull!.hasMore) {
      return;
    }
    setState(() {
      _loadingMore = true;
      _page++;
    });
    ref.read(jobsProvider((search: _search, page: _page)).future).then((_) {
      if (mounted) setState(() => _loadingMore = false);
    }).catchError((_) {
      if (mounted) setState(() => _loadingMore = false);
    });
  }

  void _applySearch(String value) {
    setState(() {
      _search = value.trim();
      _page = 1;
    });
    ref.invalidate(jobsProvider((search: _search, page: _page)));
  }

  @override
  Widget build(BuildContext context) {
    final query = (search: _search, page: _page);
    final jobs = ref.watch(jobsProvider(query));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lowongan Kerja'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(64),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchController,
              textInputAction: TextInputAction.search,
              onSubmitted: _applySearch,
              decoration: InputDecoration(
                hintText: 'Cari lowongan, perusahaan, jabatan…',
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                isDense: true,
                suffixIcon: _search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          _applySearch('');
                        },
                      )
                    : null,
              ),
            ),
          ),
        ),
      ),
      body: jobs.when(
        loading: () => const LoadingView(label: 'Memuat lowongan…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat lowongan.',
          onRetry: () => ref.invalidate(jobsProvider(query)),
        ),
        data: (page) {
          if (page.items.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(jobsProvider(query));
                await ref.read(jobsProvider(query).future);
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  EmptyView(
                    title: 'Tidak ada lowongan',
                    description: 'Coba ubah kata kunci pencarian atau muat ulang.',
                    icon: Icons.work_off_outlined,
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(jobsProvider(query));
              await ref.read(jobsProvider(query).future);
            },
            child: ListView.separated(
              controller: _scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: page.items.length + (_loadingMore ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                if (index >= page.items.length) {
                  return const Padding(
                    padding: EdgeInsets.all(12),
                    child: Center(
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      ),
                    ),
                  );
                }
                return _JobCard(job: page.items[index]);
              },
            ),
          );
        },
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  final JobVacancy job;

  const _JobCard({required this.job});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => context.push('/job/${job.id}'),
      child: Container(
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
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.business_center_outlined,
                      color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        job.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        job.companyName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                if (job.employmentType != null)
                  AppBadge(
                    label: AppConstants.employmentTypeLabel(job.employmentType),
                    tone: BadgeTone.sky,
                  ),
                if (job.location != null && job.location!.isNotEmpty)
                  AppBadge(
                    label: job.location!,
                    tone: BadgeTone.slate,
                    icon: Icons.place_outlined,
                  ),
                if (job.postedAt != null)
                  AppBadge(
                    label: Formatters.formatDateFromString(job.postedAt),
                    tone: BadgeTone.slate,
                    icon: Icons.schedule_rounded,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
