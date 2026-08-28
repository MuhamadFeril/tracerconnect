import 'package:flutter/material.dart';

/// Brand logo mark — renders the same image used for the launcher icon
/// (`assets/icon/favicon-512.png`) so the in-app logo and the app icon are
/// visually identical across splash, loading, and the home screen.
class AppLogo extends StatelessWidget {
  final double size;
  final double borderRadius;
  final bool showShadow;

  const AppLogo({
    super.key,
    this.size = 48,
    this.borderRadius = 14,
    this.showShadow = true,
  });

  @override
  Widget build(BuildContext context) {
    final image = Image.asset(
      'assets/icon/favicon-512.png',
      width: size,
      height: size,
      fit: BoxFit.contain,
    );

    if (!showShadow) {
      return SizedBox(width: size, height: size, child: image);
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: image,
      ),
    );
  }
}
