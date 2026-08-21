import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'events_providers.dart';

class EventDetailPage extends ConsumerWidget {
  final String id;

  const EventDetailPage({super.key, required this.id});

  Future<void> _toggleRegistration(BuildContext context, WidgetRef ref) async {
    try {
      final current = await ref.read(eventDetailProvider(id).future);
      if (current.registered == true) {
        await ref.read(eventsRepositoryProvider).unregister(id);
      } else {
        await ref.read(eventsRepositoryProvider).register(id);
      }
      if (!context.mounted) return;
      ref.invalidate(eventDetailProvider(id));
      ref.invalidate(eventsProvider(1));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            current.registered == true
                ? 'Pendaftaran acara dibatalkan'
                : 'Pendaftaran acara berhasil',
          ),
        ),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengubah pendaftaran acara')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final event = ref.watch(eventDetailProvider(id));

    return Scaffold(
      appBar: AppBar(title: const Text('Detail Acara')),
      body: event.when(
        loading: () => const LoadingView(label: 'Memuat acara…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat detail acara.',
          onRetry: () => ref.invalidate(eventDetailProvider(id)),
        ),
        data: (ev) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.event_rounded,
                        color: Colors.white, size: 26),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      ev.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _InfoRow(
              icon: Icons.schedule_rounded,
              title: 'Mulai',
              value: Formatters.formatDateTimeFromString(ev.startsAt),
            ),
            if (ev.endsAt != null) ...[
              const SizedBox(height: 10),
              _InfoRow(
                icon: Icons.event_available_outlined,
                title: 'Selesai',
                value: Formatters.formatDateTimeFromString(ev.endsAt),
              ),
            ],
            if (ev.location != null && ev.location!.isNotEmpty) ...[
              const SizedBox(height: 10),
              _InfoRow(
                icon: Icons.place_outlined,
                title: 'Lokasi',
                value: ev.location!,
              ),
            ],
            const SizedBox(height: 18),
            const Text(
              'Deskripsi',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              (ev.description == null || ev.description!.isEmpty)
                  ? 'Tidak ada deskripsi untuk acara ini.'
                  : ev.description!,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () => _toggleRegistration(context, ref),
              icon: Icon(
                ev.registered == true
                    ? Icons.event_available_rounded
                    : Icons.event_note_rounded,
                size: 18,
              ),
              style: ev.registered == true
                  ? FilledButton.styleFrom(backgroundColor: AppColors.surface,
                      foregroundColor: AppColors.primary)
                  : null,
              label: Text(
                ev.registered == true ? 'Terdaftar — Batalkan' : 'Daftar Acara',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;

  const _InfoRow({required this.icon, required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                ),
                const SizedBox(height: 1),
                Text(
                  value,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
