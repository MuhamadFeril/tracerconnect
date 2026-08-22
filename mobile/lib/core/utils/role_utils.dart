import '../../models/user.dart';

/// Centralised role helpers — mirrors `web/src/lib/auth.ts` ADMIN_ROLES.
///
/// The backend assigns exactly one role per user. These helpers make
/// role-based UI decisions concise and consistent.
class RoleUtils {
  RoleUtils._();

  /// Roles that see the admin dashboard on the web.
  static const adminRoles = ['super_admin', 'institution_admin'];

  /// Check whether a user holds at least one of the given [roles].
  static bool hasAnyRole(User? user, List<String> roles) {
    if (user == null) return false;
    return user.roles.any(roles.contains);
  }

  /// `true` for super admin or institution admin.
  static bool isAdmin(User? user) => hasAnyRole(user, adminRoles);

  /// `true` only for super admin.
  static bool isSuperAdmin(User? user) =>
      user?.roles.contains('super_admin') ?? false;

  /// `true` only for institution admin.
  static bool isInstitutionAdmin(User? user) =>
      user?.roles.contains('institution_admin') ?? false;

  /// `true` for alumni (the default mobile role).
  static bool isAlumni(User? user) =>
      user?.roles.contains('alumni') ?? false;

  /// `true` for employer (post/manage job vacancies).
  static bool isEmployer(User? user) =>
      user?.roles.contains('employer') ?? false;

  /// `true` when the user is *only* alumni (no admin or employer roles).
  /// This matches the web `alumniOnly` check.
  static bool isAlumniOnly(User? user) {
    if (user == null || user.roles.isEmpty) return false;
    return user.roles.every((r) => r == 'alumni');
  }

  /// Human-readable label for a role name.
  static String label(String role) => switch (role) {
        'super_admin' => 'Super Admin',
        'institution_admin' => 'Admin Institusi',
        'alumni' => 'Alumni',
        'employer' => 'Pemberi Kerja',
        _ => role.replaceAll('_', ' ').toUpperCase(),
      };
}
