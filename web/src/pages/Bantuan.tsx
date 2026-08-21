import { useState } from 'react'
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LifeBuoy,
  Mail,
  Megaphone,
  UserRound,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'

const GUIDES = [
  {
    icon: UserRound,
    title: 'Lengkapi Profil',
    description: 'Isi data diri, foto profil, dan informasi alumni agar mudah dikenali.',
    to: '/profile',
    tone: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: ClipboardList,
    title: 'Isi Kuisioner',
    description: 'Jawab tracer study dan lihat riwayat respons Anda.',
    to: '/kuisioner',
    tone: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: Users,
    title: 'Jejaring Alumni',
    description: 'Terhubung dengan sesama alumni, kirim dan terima permintaan koneksi.',
    to: '/jejaring',
    tone: 'bg-violet-50 text-violet-600',
  },
  {
    icon: Briefcase,
    title: 'Lowongan Kerja',
    description: 'Jelajahi dan lamar lowongan yang relevan dengan karier Anda.',
    to: '/lowongan',
    tone: 'bg-sky-50 text-sky-600',
  },
  {
    icon: CalendarDays,
    title: 'Acara Alumni',
    description: 'Lihat agenda reuni, webinar, dan kegiatan alumni lainnya.',
    to: '/acara',
    tone: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Megaphone,
    title: 'Pengumuman',
    description: 'Ikuti informasi terbaru dari institusi dan pengurus alumni.',
    to: '/pengumuman',
    tone: 'bg-rose-50 text-rose-600',
  },
]

const FAQS = [
  {
    q: 'Bagaimana cara mengganti foto profil?',
    a: 'Buka halaman Profil, lalu gunakan tombol "Unggah Foto" atau "Ganti Foto" pada kartu Foto Profil. Format yang didukung adalah jpg, jpeg, png, dan webp dengan ukuran maksimal 2 MB.',
  },
  {
    q: 'Bagaimana cara mengubah password akun?',
    a: 'Buka halaman Pengaturan Akun dari menu Profil, lalu isi form Ubah Password dengan password saat ini, password baru, dan konfirmasi. Password baru minimal 8 karakter.',
  },
  {
    q: 'Apakah data kuisioner saya aman?',
    a: 'Ya. Respons tracer study Anda disimpan dengan aman di server dan hanya digunakan untuk keperluan analisis institusi. Data pribadi Anda tidak dibagikan tanpa izin.',
  },
  {
    q: 'Bagaimana cara terhubung dengan alumni lain?',
    a: 'Buka halaman Jejaring, cari nama alumni pada tab Direktori, lalu klik tombol "Hubungkan". Permintaan akan dikirim dan menunggu persetujuan dari yang bersangkutan.',
  },
  {
    q: 'Siapa yang dapat dihubungi untuk bantuan teknis?',
    a: 'Silakan hubungi tim dukungan melalui email yang tertera di kartu kontak di bagian bawah halaman ini. Sebutkan email akun Anda agar kami dapat membantu lebih cepat.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <span className="text-sm font-medium text-slate-800">{q}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <p className="px-5 pb-4 text-sm leading-relaxed text-slate-500">{a}</p>}
    </div>
  )
}

export function Bantuan() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Bantuan"
        subtitle="Panduan singkat dan jawaban atas pertanyaan umum"
        actions={<LifeBuoy className="size-5 text-slate-400" />}
      />

      {/* Quick guides */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map(({ icon: Icon, title, description, to, tone }) => (
          <Link
            key={title}
            to={to}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <div className={`flex size-10 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
              {title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
          </Link>
        ))}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader
          title="Pertanyaan Umum (FAQ)"
          subtitle="Jawaban atas pertanyaan yang sering diajukan"
          actions={<BookOpen className="size-4.5 text-slate-400" />}
        />
        {FAQS.map((item) => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader
          title="Butuh Bantuan?"
          subtitle="Tim kami siap membantu Anda"
          actions={<Mail className="size-4.5 text-slate-400" />}
        />
        <div className="flex flex-col items-start gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Mail className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Dukungan via Email</p>
              <p className="text-sm text-slate-500">bantuan@tracerconnect.id</p>
            </div>
          </div>
          <a
            href="mailto:bantuan@tracerconnect.id"
            className="inline-flex h-9.5 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-[15px] font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            <Mail className="size-4" /> Hubungi Kami
          </a>
        </div>
      </Card>
    </div>
  )
}
