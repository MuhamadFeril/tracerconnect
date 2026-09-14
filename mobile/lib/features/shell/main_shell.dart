import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/role_utils.dart';
import '../auth/auth_controller.dart';

/// Shell scaffold with adaptive bottom navigation.
///
/// Alumni see:   Beranda | Kuisioner | Lowongan | Jejaring | Profil
/// HRD see: Beranda | Lowongan | Profil
/// Admin see:    Beranda | Kuisioner | Lowongan | Profil
///
/// The tab list is driven by the current user role from [authControllerProvider].
class MainShell extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const MainShell({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;
    final bottomPadding = MediaQuery.of(context).viewPadding.bottom;

    // Build tab list based on role.
    final tabs = _tabsFor(user);

    // Find the index of the current branch among visible tabs.
    final selected = tabs.indexWhere((t) => t.branch == navigationShell.currentIndex);
    final safeIndex = selected >= 0 ? selected : 0;

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: SafeArea(
          top: false,
          child: NavigationBar(
            selectedIndex: safeIndex,
            backgroundColor: AppColors.surface,
            height: 60 + bottomPadding,
            onDestinationSelected: (index) {
              final branch = tabs[index].branch;
              navigationShell.goBranch(
                branch,
                initialLocation: branch == navigationShell.currentIndex,
              );
            },
            destinations: [
              for (final tab in tabs)
                NavigationDestination(
                  icon: Icon(tab.icon),
                  selectedIcon: Icon(tab.selectedIcon),
                  label: tab.label,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A single bottom-nav tab definition.
class _NavTab {
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final int branch;

  const _NavTab(this.icon, this.selectedIcon, this.label, this.branch);
}

/// Returns the visible tabs for the given [user] role.
List<_NavTab> _tabsFor(dynamic user) {
  // HRD: Beranda | Lowongan | Profil | Chat
  if (RoleUtils.isHrd(user) && !RoleUtils.isAdmin(user)) {
    return const [
      _NavTab(Icons.home_outlined, Icons.home_rounded, 'Beranda', 0),
      _NavTab(Icons.work_outline_rounded, Icons.work_rounded, 'Lowongan', 2),
      _NavTab(Icons.person_outline_rounded, Icons.person_rounded, 'Profil', 4),
      _NavTab(Icons.chat_bubble_outline_rounded, Icons.chat_bubble_rounded, 'Chat', 5),
    ];
  }

  // Admin (super_admin / institution_admin): Beranda | Kuisioner | Lowongan | Profil
  if (RoleUtils.isAdmin(user)) {
    return const [
      _NavTab(Icons.home_outlined, Icons.home_rounded, 'Beranda', 0),
      _NavTab(Icons.assignment_outlined, Icons.assignment_rounded, 'Kuisioner', 1),
      _NavTab(Icons.work_outline_rounded, Icons.work_rounded, 'Lowongan', 2),
      _NavTab(Icons.person_outline_rounded, Icons.person_rounded, 'Profil', 4),
    ];
  }

  // Alumni (default): Beranda | Kuisioner | Lowongan | Jejaring | Profil
  return const [
    _NavTab(Icons.home_outlined, Icons.home_rounded, 'Beranda', 0),
    _NavTab(Icons.assignment_outlined, Icons.assignment_rounded, 'Kuisioner', 1),
    _NavTab(Icons.work_outline_rounded, Icons.work_rounded, 'Lowongan', 2),
    _NavTab(Icons.people_outline_rounded, Icons.people_rounded, 'Jejaring', 3),
    _NavTab(Icons.person_outline_rounded, Icons.person_rounded, 'Profil', 4),
  ];
}
