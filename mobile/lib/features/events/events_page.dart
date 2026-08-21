import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'events_providers.dart';

class EventsPage extends ConsumerWidget {
  const EventsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final events = ref.watch(eventsProvider(1));

    return Scaffold(
      appBar: AppBar(title: const Text('Acara')),
      body: events.when(
        loading: () => const LoadingView(label: 'Memuat acara…'),
        error: (e, _) => ErrorView(
          message: 'Gagal memuat acara.',
          onRetry: () => ref.invalidate(eventsProvider(1)),
        ),
        data: (page) {
          if (page.items.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 120),
                EmptyView(
                  title: 'Belum ada acara',
                  description: 'Acara alumni dari institusi Anda akan muncul di sini.',
                  icon: Icons.event_busy_outlined,
                ),
              ],
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: page.items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final event = page.items[index];
              return InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => context.push('/event/${event.id}'),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _DateBlock(date: Formatters.parseDate(event.startsAt)),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              event.title,
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              Formatters.formatDateTimeFromString(event.startsAt),
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12.5,
                              ),
                            ),
                            if (event.location != null &&
                                event.location!.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(Icons.place_outlined,
                                      size: 14, color: AppColors.textMuted),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      event.location!,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: AppColors.textMuted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded,
                          color: AppColors.textMuted, size: 20),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _DateBlock extends StatelessWidget {
  final DateTime? date;

  const _DateBlock({required this.date});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 54,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.primary, AppColors.primaryDark],
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            date == null ? '—' : _monthShort(date!),
            style: const TextStyle(
              color: Color(0xFFCBD5F5),
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            date == null ? '' : '${date!.day}',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            date == null ? '' : '${date!.year}',
            style: const TextStyle(
              color: Color(0xFFCBD5F5),
              fontSize: 9,
            ),
          ),
        ],
      ),
    );
  }

  static const _months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  String _monthShort(DateTime d) => _months[d.month - 1];
}
