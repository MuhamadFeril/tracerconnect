import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/api_envelope.dart';
import '../../models/job_application.dart';
import '../../models/job_vacancy.dart';
import 'jobs_repository.dart';

final jobsRepositoryProvider = Provider<JobsRepository>((ref) => JobsRepository());

typedef JobsQuery = ({String search, int page});

final jobsProvider = FutureProvider.family<Paged<JobVacancy>, JobsQuery>(
  (ref, query) =>
      ref.watch(jobsRepositoryProvider).list(search: query.search, page: query.page),
);

final jobDetailProvider = FutureProvider.family<JobVacancy, String>(
  (ref, id) => ref.watch(jobsRepositoryProvider).show(id),
);

/// Async action untuk melamar lowongan.
final applyJobProvider =
    FutureProvider.family<JobApplication, ({String jobId, String coverLetter})>(
  (ref, args) => ref
      .watch(jobsRepositoryProvider)
      .apply(args.jobId, coverLetter: args.coverLetter),
);

final myApplicationsProvider = FutureProvider<Paged<JobApplication>>(
  (ref) => ref.watch(jobsRepositoryProvider).myApplications(),
);

/// Toggle bookmark pada lowongan.
final bookmarkJobProvider =
    FutureProvider.family<void, ({String jobId, bool bookmarked})>(
  (ref, args) async {
    final repo = ref.watch(jobsRepositoryProvider);
    if (args.bookmarked) {
      await repo.bookmark(args.jobId);
    } else {
      await repo.unbookmark(args.jobId);
    }
  },
);

// ------------------------------------------------------------------
// Employer providers
// ------------------------------------------------------------------

typedef ApplicantsQuery = ({String jobId, String status});

/// Daftar pelamar untuk lowongan tertentu.
final applicantsProvider =
    FutureProvider.family<Paged<JobApplicant>, ApplicantsQuery>(
  (ref, query) => ref
      .watch(jobsRepositoryProvider)
      .applicants(query.jobId, status: query.status),
);
