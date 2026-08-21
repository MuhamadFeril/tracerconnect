import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_theme.dart';

class BantuanPage extends StatelessWidget {
  const BantuanPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pusat Bantuan')),
      body: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Panduan singkat dan jawaban atas pertanyaan umum',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
          const SizedBox(height: 16),

          // Quick guides
          const Text(
            'Panduan Cepat',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          _GuideCard(
            icon: Icons.person_outline_rounded,
            title: 'Lengkapi Profil',
            description:
                'Isi data diri, foto profil, dan informasi alumni agar mudah dikenali.',
            route: '/edit-profile',
            color: AppColors.primary,
          ),
          _GuideCard(
            icon: Icons.assignment_outlined,
            title: 'Isi Kuisioner',
            description:
                'Jawab tracer study dan lihat riwayat respons Anda.',
            route: '/surveys',
            color: const Color(0xFF059669),
          ),
          _GuideCard(
            icon: Icons.people_outline_rounded,
            title: 'Jejaring Alumni',
            description:
                'Terhubung dengan sesama alumni, kirim dan terima permintaan koneksi.',
            route: '/network',
            color: const Color(0xFF7C3AED),
          ),
          _GuideCard(
            icon: Icons.work_outline_rounded,
            title: 'Lowongan Kerja',
            description:
                'Jelajahi dan lamar lowongan yang relevan dengan karier Anda.',
            route: '/jobs',
            color: const Color(0xFF0284C7),
          ),
          _GuideCard(
            icon: Icons.event_outlined,
            title: 'Acara Alumni',
            description:
                'Lihat agenda reuni, webinar, dan kegiatan alumni lainnya.',
            route: '/events',
            color: const Color(0xFFD97706),
          ),
          _GuideCard(
            icon: Icons.campaign_outlined,
            title: 'Pengumuman',
            description:
                'Ikuti informasi terbaru dari institusi dan pengurus alumni.',
            route: '/announcements',
            color: const Color(0xFFE11D48),
          ),

          const SizedBox(height: 24),

          // FAQ
          const Text(
            'Pertanyaan Umum (FAQ)',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          _FaqItem(
            question: 'Bagaimana cara mengganti foto profil?',
            answer:
                'Buka halaman Profil, lalu gunakan tombol "Unggah Foto" atau "Ganti Foto" pada kartu Foto Profil. Format yang didukung adalah jpg, jpeg, png, dan webp dengan ukuran maksimal 2 MB.',
          ),
          _FaqItem(
            question: 'Bagaimana cara mengubah password akun?',
            answer:
                'Buka halaman Pengaturan Akun dari menu Profil, lalu isi form Ubah Password dengan password saat ini, password baru, dan konfirmasi. Password baru minimal 8 karakter.',
          ),
          _FaqItem(
            question: 'Apakah data kuisioner saya aman?',
            answer:
                'Ya. Respons tracer study Anda disimpan dengan aman di server dan hanya digunakan untuk keperluan analisis institusi. Data pribadi Anda tidak dibagikan tanpa izin.',
          ),
          _FaqItem(
            question: 'Bagaimana cara terhubung dengan alumni lain?',
            answer:
                'Buka halaman Jejaring, cari nama alumni pada tab Direktori, lalu klik tombol "Hubungkan". Permintaan akan dikirim dan menunggu persetujuan dari yang bersangkutan.',
          ),
          _FaqItem(
            question: 'Siapa yang dapat dihubungi untuk bantuan teknis?',
            answer:
                'Silakan hubungi tim dukungan melalui email yang tertera di bawah.',
          ),

          const SizedBox(height: 24),

          // Contact
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Butuh Bantuan?',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Tim kami siap membantu Anda',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(11),
                      ),
                      child: const Icon(Icons.mail_outline_rounded,
                          color: AppColors.textMuted, size: 21),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Dukungan via Email',
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            'bantuan@tracerconnect.id',
                            style: TextStyle(
                                color: AppColors.textSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () async {
                      final uri = Uri.parse('mailto:bantuan@tracerconnect.id');
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri);
                      }
                    },
                    icon: const Icon(Icons.mail_outline_rounded, size: 18),
                    label: const Text('Hubungi Kami'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _GuideCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final String route;
  final Color color;

  const _GuideCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.route,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push(route),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20, color: color),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded,
                  color: AppColors.textMuted, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _FaqItem extends StatefulWidget {
  final String question;
  final String answer;

  const _FaqItem({required this.question, required this.answer});

  @override
  State<_FaqItem> createState() => _FaqItemState();
}

class _FaqItemState extends State<_FaqItem> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(
          bottom: BorderSide(color: AppColors.border),
        ),
      ),
      child: InkWell(
        onTap: () => setState(() => _expanded = !_expanded),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.question,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Icon(
                    _expanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: AppColors.textMuted,
                    size: 22,
                  ),
                ],
              ),
              if (_expanded) ...[
                const SizedBox(height: 8),
                Text(
                  widget.answer,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
