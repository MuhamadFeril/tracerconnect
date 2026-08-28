import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'app_logo.dart';

/// A playful "lagging" loader that mimics a slow / stuttering connection:
/// an erratic buffering bar that snaps forward then stalls, plus a jittering
/// logo tile and a blinking status text.
///
/// Use it for intentionally retro / funny loading states (e.g. a fake
/// "nyambung ke server…" moment).
class LagLoader extends StatefulWidget {
  final String label;

  const LagLoader({super.key, this.label = 'Menyambungkan ke server…'});

  @override
  State<LagLoader> createState() => _LagLoaderState();
}

class _LagLoaderState extends State<LagLoader> with TickerProviderStateMixin {
  late final AnimationController _jitterController;
  late final AnimationController _barController;
  late final AnimationController _blinkController;
  late final AnimationController _spinController;

  @override
  void initState() {
    super.initState();

    // Jitter: tiny horizontal shake
    _jitterController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    )..repeat();

    // Bar: erratic buffering fill that snaps then stalls
    _barController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    )..repeat();

    // Blink: ellipsis text blink
    _blinkController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat();

    // Spin: partial ring rotation
    _spinController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();
  }

  @override
  void dispose() {
    _jitterController.dispose();
    _barController.dispose();
    _blinkController.dispose();
    _spinController.dispose();
    super.dispose();
  }

  /// Simulate the erratic buffering bar: percentage that snaps forward
  /// then stalls, mimicking a slow connection.
  double _lagFill(double t) {
    // These keyframes mirror the CSS lag-fill animation
    const stops = [
      (0.00, 4.0),
      (0.12, 38.0),
      (0.13, 39.0),
      (0.34, 41.0),
      (0.35, 46.0),
      (0.52, 68.0),
      (0.53, 69.0),
      (0.70, 71.0),
      (0.88, 94.0),
      (0.89, 95.0),
      (1.00, 100.0),
    ];

    for (int i = 0; i < stops.length - 1; i++) {
      final (t0, v0) = stops[i];
      final (t1, v1) = stops[i + 1];
      if (t >= t0 && t <= t1) {
        // Linear interpolation between stops (snap feel via short segments)
        final local = (t - t0) / (t1 - t0);
        return v0 + (v1 - v0) * local;
      }
    }
    return 100.0;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Jittering logo tile with partial spinning ring
          AnimatedBuilder(
            animation: Listenable.merge([
              _jitterController,
              _spinController,
            ]),
            builder: (context, _) {
              // Jitter: tiny horizontal shake
              final jitter =
                  math.sin(_jitterController.value * math.pi * 4) * 1.5;

              return Transform.translate(
                offset: Offset(jitter, 0),
                child: SizedBox(
                  width: 64,
                  height: 64,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Logo tile
                      const AppLogo(size: 52, borderRadius: 16),
                      // Partial spinning ring (short arc for lag feel)
                      SizedBox(
                        width: 64,
                        height: 64,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          value: 0.15, // Short arc
                          color: cs.primary.withValues(alpha: 0.4),
                          backgroundColor: cs.primary.withValues(alpha: 0.1),
                        ),
                      ),
                      // Spinning arc overlay
                      Transform.rotate(
                        angle: _spinController.value * 2 * math.pi,
                        child: SizedBox(
                          width: 64,
                          height: 64,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            value: 0.2,
                            color: cs.primary,
                            backgroundColor: Colors.transparent,
                            strokeCap: StrokeCap.round,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),

          const SizedBox(height: 20),

          // Erratic buffering bar
          AnimatedBuilder(
            animation: _barController,
            builder: (context, _) {
              final percent = _lagFill(_barController.value) / 100.0;
              return SizedBox(
                width: 200,
                child: Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: percent,
                        minHeight: 8,
                        backgroundColor: cs.surfaceContainerHighest,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          cs.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),

          const SizedBox(height: 14),

          // Blinking status text
          AnimatedBuilder(
            animation: _blinkController,
            builder: (context, _) {
              final opacity =
                  _blinkController.value < 0.5 ? 1.0 : 0.25;
              return Opacity(
                opacity: opacity,
                child: Text(
                  '${widget.label}…',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
