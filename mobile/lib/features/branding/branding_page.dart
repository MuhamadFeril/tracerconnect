import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'branding_providers.dart';
import 'branding_repository.dart';

class BrandingPage extends ConsumerWidget {
  const BrandingPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final branding = ref.watch(brandingProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        title: const Text(
          'Branding Institusi',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      body: branding.when(
        loading: () => const LoadingView(label: 'Memuat branding…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat data branding.',
          onRetry: () => ref.invalidate(brandingProvider),
        ),
        data: (data) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Logo preview
            _LogoSection(branding: data),
            const SizedBox(height: 16),

            // Primary color
            _ColorSection(color: data.primaryColor),
            const SizedBox(height: 16),

            // Contact info
            _InfoSection(
              title: 'Kontak',
              items: [
                if (data.contactEmail != null && data.contactEmail!.isNotEmpty)
                  _InfoItem(icon: Icons.email_outlined, label: 'Email', value: data.contactEmail!),
                if (data.contactPhone != null && data.contactPhone!.isNotEmpty)
                  _InfoItem(icon: Icons.phone_outlined, label: 'Telepon', value: data.contactPhone!),
              ],
            ),
            const SizedBox(height: 16),

            // About
            if (data.about != null && data.about!.isNotEmpty)
              _InfoSection(
                title: 'Tentang Institusi',
                items: [_InfoItem(icon: Icons.info_outline, label: '', value: data.about!)],
              ),

            // Footer
            if (data.customFooter != null && data.customFooter!.isNotEmpty) ...[
              const SizedBox(height: 16),
              _InfoSection(
                title: 'Footer',
                items: [_InfoItem(icon: Icons.text_snippet_outlined, label: '', value: data.customFooter!)],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _LogoSection extends StatelessWidget {
  final InstitutionBranding branding;

  const _LogoSection({required this.branding});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
            child: branding.logoUrl != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: Image.network(
                      branding.logoUrl!,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Icon(
                        Icons.school_outlined,
                        size: 40,
                        color: AppColors.textMuted,
                      ),
                    ),
                  )
                : const Icon(
                    Icons.school_outlined,
                    size: 40,
                    color: AppColors.textMuted,
                  ),
          ),
          const SizedBox(height: 12),
          Text(
            branding.name,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ColorSection extends StatelessWidget {
  final String? color;

  const _ColorSection({required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: _parseColor(color),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Warna Branding',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  color ?? '#1E3A8A (default)',
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 13,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _parseColor(String? hex) {
    if (hex == null || hex.isEmpty) return AppColors.primary;
    try {
      final clean = hex.replaceFirst('#', '');
      return Color(int.parse('FF$clean', radix: 16));
    } catch (_) {
      return AppColors.primary;
    }
  }
}

class _InfoSection extends StatelessWidget {
  final String title;
  final List<_InfoItem> items;

  const _InfoSection({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
            child: Text(
              title,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 8),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(item.icon, size: 18, color: AppColors.textMuted),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (item.label.isNotEmpty)
                          Text(
                            item.label,
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 11,
                            ),
                          ),
                        Text(
                          item.value,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 6),
        ],
      ),
    );
  }
}

class _InfoItem {
  final IconData icon;
  final String label;
  final String value;

  const _InfoItem({required this.icon, required this.label, required this.value});
}
