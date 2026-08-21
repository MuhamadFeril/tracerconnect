import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

enum BadgeTone { navy, green, amber, red, sky, slate, violet }

/// Label kecil berwarna untuk status / kategori.
class AppBadge extends StatelessWidget {
  final String label;
  final BadgeTone tone;
  final IconData? icon;

  const AppBadge({super.key, required this.label, this.tone = BadgeTone.navy, this.icon});

  @override
  Widget build(BuildContext context) {
    final colors = switch (tone) {
      BadgeTone.navy => (AppColors.primaryLight, AppColors.primary),
      BadgeTone.green => (AppColors.successBg, AppColors.success),
      BadgeTone.amber => (AppColors.warningBg, AppColors.warning),
      BadgeTone.red => (AppColors.dangerBg, AppColors.danger),
      BadgeTone.sky => (AppColors.infoBg, AppColors.info),
      BadgeTone.violet => (AppColors.violetBg, AppColors.violet),
      BadgeTone.slate => (const Color(0xFFF1F5F9), AppColors.textSecondary),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: colors.$1,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: colors.$2),
            const SizedBox(width: 3),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: colors.$2,
            ),
          ),
        ],
      ),
    );
  }
}
