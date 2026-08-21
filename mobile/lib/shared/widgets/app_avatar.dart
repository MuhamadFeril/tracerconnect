import 'package:flutter/material.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';

/// Avatar dengan fallback inisial + gradasi navy.
class AppAvatar extends StatelessWidget {
  final String? imageUrl;
  final String? name;
  final double size;

  const AppAvatar({
    super.key,
    this.imageUrl,
    this.name,
    this.size = 48,
  });

  @override
  Widget build(BuildContext context) {
    final resolved = AppConstants.resolveAssetUrl(imageUrl);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primary, AppColors.primaryDark],
        ),
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.18),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: resolved.isNotEmpty
          ? Image.network(
              resolved,
              width: size,
              height: size,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _Initials(name: name, size: size),
            )
          : _Initials(name: name, size: size),
    );
  }
}

class _Initials extends StatelessWidget {
  final String? name;
  final double size;

  const _Initials({this.name, required this.size});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        Formatters.initials(name),
        style: TextStyle(
          color: Colors.white,
          fontSize: size * 0.38,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
