import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/announcements/announcement_detail_page.dart';
import '../../features/announcements/announcements_page.dart';
import '../../features/data_quality/data_quality_page.dart';
import '../../features/branding/branding_page.dart';
import '../../core/utils/role_utils.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/auth/forgot_password_page.dart';
import '../../features/auth/login_page.dart';
import '../../features/auth/register_page.dart';
import '../../features/auth/reset_password_page.dart';
import '../../features/auth/splash_page.dart';
import '../../features/chat/chat_detail_page.dart';
import '../../features/chat/chat_list_page.dart';
import '../../features/chat/new_conversation_page.dart';
import '../../features/events/event_detail_page.dart';
import '../../features/events/events_page.dart';
import '../../features/home/home_page.dart';
import '../../features/jobs/employer_applicants_page.dart';
import '../../features/jobs/employer_job_form_page.dart';
import '../../features/jobs/employer_jobs_page.dart';
import '../../features/jobs/job_detail_page.dart';
import '../../features/jobs/jobs_page.dart';
import '../../features/jobs/my_applications_page.dart';
import '../../features/jobs/my_bookmarks_page.dart';
import '../../features/landing/landing_page.dart';
import '../../features/networking/alumni_detail_page.dart';
import '../../features/networking/networking_page.dart';
import '../../features/notifications/notifications_page.dart';
import '../../features/profile/blocked_users_page.dart';
import '../../features/profile/change_password_page.dart';
import '../../features/profile/edit_profile_page.dart';
import '../../features/profile/bantuan_page.dart';
import '../../features/profile/pengaturan_page.dart';
import '../../features/profile/profile_page.dart';
import '../../features/shell/main_shell.dart';

import '../../features/surveys/survey_fill_page.dart';
import '../../features/surveys/survey_result_page.dart';
import '../../features/surveys/surveys_page.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final location = state.matchedLocation;

      // Sesi sedang dipulihkan (splash).
      if (auth.status == AuthStatus.unknown) {
        return location == '/splash' ? null : '/splash';
      }

      // Belum login. Splash hanya sah saat status `unknown`.
      // Setelah pemulihan selesai tanpa sesi, arahkan ke landing page.
      if (auth.status == AuthStatus.unauthenticated) {
        const publicLocations = [
          '/',
          '/landing',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
        ];
        if (publicLocations.contains(location)) return null;
        return '/landing';
      }

      // Sudah login: jangan biarkan mengakses layar auth.
      // Employer diarahkan ke /jobs (paritas web), admin & alumni ke /home.
      if (location == '/splash' ||
          location == '/landing' ||
          location == '/login' ||
          location == '/register' ||
          location == '/forgot-password' ||
          location == '/reset-password') {
        return RoleUtils.isEmployer(auth.user) && !RoleUtils.isAdmin(auth.user)
            ? '/jobs'
            : '/home';
      }

      // Role-based route guards: employer tidak bisa akses fitur alumni/admin.
      final user = auth.user;
      final isEmployerOnly = RoleUtils.isEmployer(user) && !RoleUtils.isAdmin(user);
      if (isEmployerOnly) {
        // Employer: larang akses kuisioner, jejaring, tracer history, lamaran.
        const blockedEmployer = ['/surveys', '/network', '/my-applications', '/my-bookmarks'];
        if (blockedEmployer.any(location.startsWith)) return '/home';
      }

      final isAlumniOnly = RoleUtils.isAlumniOnly(user);
      if (isAlumniOnly) {
        // Alumni: larang akses employer job management.
        if (location.startsWith('/employer-jobs')) return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/',
        redirect: (context, state) => '/landing',
      ),
      GoRoute(
        path: '/landing',
        builder: (context, state) => const LandingPage(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterPage(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (context, state) => ResetPasswordPage(
          email: state.uri.queryParameters['email'],
        ),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/surveys',
                builder: (context, state) => const SurveysPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/jobs',
                builder: (context, state) => const JobsPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/network',
                builder: (context, state) => const NetworkingPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfilePage(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/announcements',
        builder: (context, state) => const AnnouncementsPage(),
      ),
      GoRoute(
        path: '/announcement/:id',
        builder: (context, state) =>
            AnnouncementDetailPage(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/events',
        builder: (context, state) => const EventsPage(),
      ),
      GoRoute(
        path: '/event/:id',
        builder: (context, state) =>
            EventDetailPage(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/job/:id',
        builder: (context, state) =>
            JobDetailPage(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/my-applications',
        builder: (context, state) => const MyApplicationsPage(),
      ),
      GoRoute(
        path: '/my-bookmarks',
        builder: (context, state) => const MyBookmarksPage(),
      ),
      GoRoute(
        path: '/survey/:id',
        builder: (context, state) =>
            SurveyFillPage(surveyId: state.pathParameters['id']),
      ),
      GoRoute(
        path: '/response/:id',
        builder: (context, state) =>
            SurveyResultPage(responseId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsPage(),
      ),
      GoRoute(
        path: '/network-alumni/:id',
        builder: (context, state) =>
            AlumniDetailPage(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/chat',
        builder: (context, state) => const ChatListPage(),
      ),
      GoRoute(
        path: '/chat/new',
        builder: (context, state) => const NewConversationPage(),
      ),
      GoRoute(
        path: '/chat/:id',
        builder: (context, state) =>
            ChatDetailPage(conversationId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/edit-profile',
        builder: (context, state) => const EditProfilePage(),
      ),
      GoRoute(
        path: '/change-password',
        builder: (context, state) => const ChangePasswordPage(),
      ),
      GoRoute(
        path: '/blocked-users',
        builder: (context, state) => const BlockedUsersPage(),
      ),

      // Survey result
      GoRoute(
        path: '/survey-result/:responseId',
        builder: (context, state) =>
            SurveyResultPage(responseId: state.pathParameters['responseId']!),
      ),

      // Employer job management
      GoRoute(
        path: '/employer-jobs',
        builder: (context, state) => const EmployerJobsPage(),
      ),
      GoRoute(
        path: '/employer-jobs/new',
        builder: (context, state) => const EmployerJobFormPage(),
      ),
      GoRoute(
        path: '/employer-jobs/:id/edit',
        builder: (context, state) => EmployerJobFormPage(
          jobId: state.pathParameters['id'],
        ),
      ),
      GoRoute(
        path: '/employer-jobs/:id/applicants',
        builder: (context, state) => EmployerApplicantsPage(
          jobId: state.pathParameters['id']!,
          jobTitle: state.uri.queryParameters['title'],
        ),
      ),
      // Institution Branding
      GoRoute(
        path: '/branding',
        builder: (context, state) => const BrandingPage(),
      ),
      // Data Quality Center
      GoRoute(
        path: '/data-quality',
        builder: (context, state) => const DataQualityPage(),
      ),
      // Help
      GoRoute(
        path: '/bantuan',
        builder: (context, state) => const BantuanPage(),
      ),
      // Settings
      GoRoute(
        path: '/pengaturan',
        builder: (context, state) => const PengaturanPage(),
      ),
    ],
  );

  // Sinkronkan redirect dengan perubahan status autentikasi.
  ref.listen(authControllerProvider, (previous, next) {
    if (previous?.status != next.status) router.refresh();
  });

  return router;
});
