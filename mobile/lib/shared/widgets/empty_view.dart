import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class EmptyView extends StatelessWidget {
  final String title;
  final String? description;
  final IconData icon;

  const EmptyView({
    super.key,
    required this.title,
    this.description,
    this.icon = Icons.inbox_rounded,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: AppColors.primaryLight,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: AppColors.primary, size: 28),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (description != null) ...[
              const SizedBox(height: 6),
              Text(
                description!,
                textAlign: TextAlign.center,
                style:
                    const TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
