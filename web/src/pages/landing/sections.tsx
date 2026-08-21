import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bookmark,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Database,
  FileDown,
  FileText,
  Globe,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Network,
  PenLine,
  PieChart,
  RefreshCw,
  Search,
  Send,
  Shield,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { Logo } from '../../components/ui/Logo'

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={clsx(
        'transition-all duration-700 ease-out will-change-transform',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string
  title: string
  description?: string
  align?: 'center' | 'left'
}) {
  return (
    <Reveal className={clsx('max-w-2xl', align === 'center' ? 'mx-auto text-center' : '')}>
      <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">{description}</p>}
    </Reveal>
  )
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 size-[32rem] animate-blob rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="absolute top-24 -right-40 size-[36rem] animate-blob rounded-full bg-indigo-200/50 blur-3xl [animation-delay:-5s]" />
        <div className="absolute bottom-0 left-1/3 size-[24rem] animate-blob rounded-full bg-indigo-100/60 blur-3xl [animation-delay:-9s]" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-medium text-indigo-700">
              <Sparkles className="size-3.5" />
              Platform Tracer Study &amp; Alumni Engagement
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 text-4xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
              Kelola Tracer Study Alumni{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                Lebih Mudah, Cepat, dan Terukur.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              TracerConnect membantu institusi mengelola data alumni, membuat kuisioner, memantau
              respons, menganalisis hasil, dan menghasilkan laporan — semua dalam satu platform.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="group inline-flex h-12 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-[15px] font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40"
              >
                Coba Demo
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#fitur"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
              >
                Lihat Fitur
              </a>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
              {['Tanpa coding', 'Multi-institusi', 'Laporan otomatis', 'Mobile friendly'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Dashboard mockup */}
        <Reveal delay={200} className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-600/10 to-indigo-800/10 blur-2xl" />
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-indigo-900/10 sm:p-5">
            {/* Window bar */}
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <span className="size-2.5 rounded-full bg-rose-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 hidden rounded-md bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">
                tracerconnect.app/dashboard
              </span>
            </div>

            {/* Stat cards */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Total Alumni', value: '1.248' },
                { label: 'Responden', value: '936' },
                { label: 'Response Rate', value: '75%' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-medium text-slate-400">{s.label}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Chart area */}
            <div className="mt-4 grid grid-cols-5 gap-3">
              <div className="col-span-3 rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-slate-500">Status Kerja Alumni</p>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-semibold text-indigo-600">
                    Real-time
                  </span>
                </div>
                <div className="mt-3 flex h-24 items-end gap-1.5">
                  {[35, 55, 40, 70, 58, 82, 66, 92, 74, 60, 85, 48].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className={clsx(
                        'flex-1 rounded-t-md',
                        i % 3 === 0 ? 'bg-indigo-600' : 'bg-indigo-200',
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="col-span-2 flex flex-col justify-between rounded-xl border border-slate-100 p-3">
                <p className="text-[10px] font-semibold text-slate-500">Sebaran</p>
                <div
                  className="mx-auto my-2 size-20 rounded-full"
                  style={{
                    background:
                      'conic-gradient(#1e3a8a 0 46%, #2c54ac 46% 68%, #5780cb 68% 84%, #8ca6dc 84% 100%)',
                  }}
                />
                <div className="space-y-1">
                  {[
                    ['Bekerja', '#1e3a8a'],
                    ['Wirausaha', '#2c54ac'],
                    ['Studi lanjut', '#5780cb'],
                  ].map(([label, color]) => (
                    <div key={label} className="flex items-center gap-1.5 text-[9px] text-slate-500">
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent row */}
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                A
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-800">Andi Pratama — 2022</p>
                <p className="truncate text-[10px] text-slate-400">Tracer Study Angkatan 2022 · selesai</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-600">
                ✓ Terkirim
              </span>
            </div>
          </div>

          {/* Floating badges */}
          <div className="absolute -top-5 -right-3 hidden animate-pulse rounded-xl border border-slate-100 bg-white px-4 py-2.5 shadow-lg sm:block">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <TrendingUp className="size-4 text-emerald-500" /> Response rate naik
            </p>
          </div>
          <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-slate-100 bg-white px-4 py-2.5 shadow-lg sm:block">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <FileDown className="size-4 text-indigo-500" /> Laporan PDF siap unduh
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Trust bar                                                           */
/* ------------------------------------------------------------------ */

const TRUST_ITEMS = [
  { icon: Database, title: 'Data Alumni Terpusat', description: 'Semua data dalam satu database yang rapi dan aman' },
  { icon: ListChecks, title: 'Kuisioner Dinamis', description: 'Buat kuisioner tanpa menulis kode sama sekali' },
  { icon: BarChart3, title: 'Dashboard Analytics', description: 'Statistik respons dihitung otomatis dan real-time' },
  { icon: FileText, title: 'Laporan Siap Pakai', description: 'Hasilkan laporan tracer study dalam hitungan detik' },
]

function TrustBar() {
  return (
    <section className="border-y border-slate-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {TRUST_ITEMS.map((item, i) => (
          <Reveal key={item.title} delay={i * 80} className="flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <item.icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Problem                                                             */
/* ------------------------------------------------------------------ */

const PROBLEMS = [
  'Data alumni tersebar di banyak file dan aplikasi',
  'Rekap dan rekap ulang masih dilakukan manual',
  'Sulit memantau siapa yang sudah mengisi kuisioner',
  'Penyusunan laporan memakan waktu berhari-hari',
  'Sulit melihat kondisi dan perkembangan alumni',
]

function Problem() {
  return (
    <section id="masalah" className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="Masalah"
          title="Masih Mengelola Tracer Study Secara Manual?"
          description="Banyak institusi menghabiskan waktu dan tenaga untuk proses yang seharusnya bisa otomatis."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map((problem, i) => (
            <Reveal
              key={problem}
              delay={i * 60}
              className={clsx(
                'flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-5',
                i === PROBLEMS.length - 1 && 'sm:col-span-2 lg:col-span-1',
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <X className="size-4" />
              </div>
              <p className="text-sm font-medium text-slate-700">{problem}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Solution                                                            */
/* ------------------------------------------------------------------ */

const SOLUTIONS = [
  { icon: Users, title: 'Alumni Management', description: 'Kelola, import, dan ekspor data alumni dengan mudah' },
  { icon: PenLine, title: 'Questionnaire Builder', description: 'Rancang kuisioner dengan berbagai tipe pertanyaan' },
  { icon: Send, title: 'Survey Publishing', description: 'Terbitkan survey dan undang alumni untuk mengisi' },
  { icon: ClipboardList, title: 'Response Tracking', description: 'Pantau progres pengisian secara real-time' },
  { icon: TrendingUp, title: 'Analytics', description: 'Statistik keterisian dan kondisi alumni otomatis' },
  { icon: FileText, title: 'Reports', description: 'Unduh laporan dalam format CSV, Excel, dan PDF' },
  { icon: Briefcase, title: 'Career Center', description: 'Job board dan lamaran kerja untuk alumni' },
  { icon: Megaphone, title: 'Engagement', description: 'Pengumuman, acara alumni, dan notifikasi' },
]

function Solution() {
  return (
    <section id="solusi" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="Solusi"
          title="Satu Platform untuk Seluruh Proses Tracer Study"
          description="Dari pengumpulan data hingga laporan akhir — TracerConnect menyatukan seluruh alur kerja tracer study Anda."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOLUTIONS.map((item, i) => (
            <Reveal
              key={item.title}
              delay={(i % 4) * 60}
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <item.icon className="size-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{item.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Feature showcase                                                    */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard Statistik',
    description: 'Ringkasan total alumni, responden, response rate, dan distribusi status kerja dalam satu layar.',
  },
  {
    icon: PenLine,
    title: 'Questionnaire Builder',
    description: 'Buat section, tipe pertanyaan beragam, atur urutan, dan logika kondisional tanpa coding.',
  },
  {
    icon: Users,
    title: 'Alumni Management',
    description: 'Import massal via CSV/Excel, filter per jurusan dan angkatan, serta kelola profil alumni.',
  },
  {
    icon: ClipboardList,
    title: 'Tracer Response',
    description: 'Alumni mengisi survey dengan opsi simpan draft dan lanjutkan kapan saja.',
  },
  {
    icon: FileText,
    title: 'Report Generator',
    description: 'Buat executive summary dan laporan tracer study siap presentasi dalam sekali klik.',
  },
  {
    icon: Briefcase,
    title: 'Career Center',
    description: 'Job board untuk alumni — cari, simpan, dan lamar lowongan kerja.',
  },
  {
    icon: CalendarDays,
    title: 'Event Alumni',
    description: 'Publikasikan acara reuni, webinar, dan kegiatan alumni lainnya.',
  },
  {
    icon: Bell,
    title: 'Notification',
    description: 'Kirim pengumuman dan notifikasi untuk meningkatkan partisipasi alumni.',
  },
]

function FeatureShowcase() {
  return (
    <section id="fitur" className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="Fitur"
          title="Semua yang Anda Butuhkan untuk Tracer Study"
          description="Modul lengkap yang saling terhubung — dari data alumni sampai laporan akhir."
        />
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <Reveal
              key={feature.title}
              delay={(i % 4) * 60}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/70"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-800 text-white shadow-md shadow-indigo-500/30">
                <feature.icon className="size-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-900">{feature.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{feature.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Workflow                                                            */
/* ------------------------------------------------------------------ */

const WORKFLOW_STEPS = [
  'Buat akun institusi',
  'Import data alumni',
  'Buat kuisioner',
  'Publish survey',
  'Alumni mengisi',
  'Sistem menghitung statistik',
  'Download laporan',
]

function Workflow() {
  return (
    <section id="cara-kerja" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="Cara Kerja"
          title="Mulai dari Nol dalam 7 Langkah"
          description="Alur kerja yang jelas dan sederhana — tim Anda langsung produktif di hari pertama."
        />
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_STEPS.map((step, i) => (
            <Reveal key={step} delay={(i % 4) * 70} className="relative">
              <div className="h-full rounded-2xl border border-slate-200 bg-slate-50/60 p-6 transition-colors hover:bg-indigo-50/60">
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-600/30">
                  {i + 1}
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900">{step}</p>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <ArrowRight className="absolute top-1/2 -right-4 hidden size-4 -translate-y-1/2 text-indigo-300 lg:block" />
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Analytics preview                                                   */
/* ------------------------------------------------------------------ */

const METRICS = [
  'Total alumni',
  'Response rate',
  'Employment rate',
  'Further study rate',
  'Rata-rata masa tunggu kerja',
  'Relevansi bidang kerja',
  'Sebaran industri',
  'Perbandingan antar program',
]

function AnalyticsPreview() {
  return (
    <section id="analytics" className="relative overflow-hidden bg-slate-900">
      <div className="pointer-events-none absolute -top-40 right-0 size-[30rem] animate-blob rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 size-[26rem] animate-blob rounded-full bg-indigo-600/20 blur-3xl [animation-delay:-7s]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
        <Reveal>
          <p className="text-sm font-semibold tracking-wide text-indigo-400 uppercase">Analytics</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Statistik yang Dihitung Otomatis
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
            Setiap respons langsung diterjemahkan menjadi insight — tanpa perlu mengolah angka secara
            manual.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {METRICS.map((metric, i) => (
              <Reveal key={metric} delay={i * 40}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-indigo-500 hover:text-white">
                  <Check className="size-3 text-indigo-400" />
                  {metric}
                </span>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-300">Employment Rate per Angkatan</p>
              <PieChart className="size-4 text-indigo-400" />
            </div>
            <div className="mt-5 grid grid-cols-4 gap-3">
              {[
                { year: '2021', value: '82%' },
                { year: '2022', value: '76%' },
                { year: '2023', value: '84%' },
                { year: '2024', value: '88%' },
              ].map((item, i) => (
                <div key={item.year} className="rounded-xl bg-slate-900/60 p-3 text-center">
                  <p className="text-[10px] text-slate-500">{item.year}</p>
                  <p className="mt-1 text-sm font-bold text-white">{item.value}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600"
                      style={{ width: `${[82, 76, 84, 88][i]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ['Bekerja', '68%'],
                ['Wirausaha', '12%'],
                ['Melanjutkan studi', '14%'],
                ['Belum bekerja', '6%'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2">
                  <span className="text-[11px] text-slate-400">{label}</span>
                  <span className="text-xs font-bold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Mobile                                                              */
/* ------------------------------------------------------------------ */

const MOBILE_FEATURES = [
  'Login & profil alumni',
  'Mengisi tracer questionnaire',
  'Simpan draft & lanjutkan lagi',
  'Lihat lowongan kerja',
  'Acara alumni',
  'Notifikasi',
]

function MobilePreview() {
  return (
    <section id="mobile" className="bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
        <Reveal className="order-2 lg:order-1">
          <div className="mx-auto w-fit rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl">
            <div className="w-64 overflow-hidden rounded-[1.9rem] bg-white sm:w-72">
              {/* Phone status bar */}
              <div className="flex items-center justify-between bg-indigo-600 px-5 pt-4 pb-3">
                <div>
                  <p className="text-[10px] text-indigo-200">Selamat datang,</p>
                  <p className="text-sm font-bold text-white">Andi Pratama</p>
                </div>
                <div className="flex size-8 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                  A
                </div>
              </div>
              <div className="space-y-2.5 p-4">
                <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-800 p-3.5 text-white">
                  <p className="text-[10px] text-indigo-200">Tracer Study 2024</p>
                  <p className="mt-0.5 text-xs font-bold">Progress Anda 80%</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
                    <div className="h-full w-4/5 rounded-full bg-white" />
                  </div>
                </div>
                {[
                  { label: 'Lanjutkan Survey', meta: '8 pertanyaan tersisa', active: true },
                  { label: 'Lowongan Terbaru', meta: '12 lowongan untuk Anda', active: false },
                  { label: 'Acara Reuni 2024', meta: 'Sabtu, 12 September', active: false },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text-slate-800">{card.label}</p>
                      <p className="text-[10px] text-slate-400">{card.meta}</p>
                    </div>
                    <ArrowRight className="size-3.5 text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="order-1 lg:order-2">
          <SectionHeading
            align="left"
            eyebrow="Aplikasi Mobile"
            title="Alumni Mengisi dari Mana Saja"
            description="Aplikasi mobile membuat alumni tetap terlibat — kapan pun dan di mana pun."
          />
          <div className="mt-8 space-y-3">
            {MOBILE_FEATURES.map((feature, i) => (
              <Reveal key={feature} delay={i * 50} className="flex items-center gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="size-4" />
                </div>
                <p className="text-sm font-medium text-slate-700">{feature}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={300}>
            <div className="mt-8 flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Smartphone className="size-5 shrink-0 text-indigo-600" />
              <p className="text-xs leading-relaxed text-slate-500">
                Response rate yang tinggi dimulai dari kemudahan akses — alumni cukup membuka
                aplikasi di ponselnya.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Career center                                                       */
/* ------------------------------------------------------------------ */

const CAREER_ITEMS = [
  { icon: Briefcase, label: 'Lowongan kerja terkurasi' },
  { icon: Bookmark, label: 'Simpan lowongan favorit' },
  { icon: Send, label: 'Kirim lamaran langsung' },
  { icon: RefreshCw, label: 'Pantau status lamaran' },
  { icon: CalendarDays, label: 'Event & networking alumni' },
  { icon: Users, label: 'Fondasi komunitas alumni' },
]

function CareerCenter() {
  return (
    <section id="career" className="bg-slate-50">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Career Center"
            title="Lebih dari Sekadar Tracer Study"
            description="Dukung alumni tidak hanya dengan data, tetapi juga peluang — lowongan kerja, lamaran, dan jejaring."
          />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {CAREER_ITEMS.map((item, i) => (
              <Reveal
                key={item.label}
                delay={i * 50}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-indigo-200"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <item.icon className="size-4.5" />
                </div>
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={150}>
          <div className="space-y-3">
            {[
              { role: 'Software Engineer', company: 'PT Teknologi Nusantara', type: 'Full Time', badge: 'Baru' },
              { role: 'UI/UX Designer', company: 'Studio Kreatif Bandung', type: 'Full Time', badge: 'Hot' },
              { role: 'Digital Marketing Intern', company: 'PT Media Digital', type: 'Magang', badge: 'Internship' },
            ].map((job) => (
              <div
                key={job.role}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-800 font-bold text-white">
                  {job.company.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{job.role}</p>
                  <p className="truncate text-xs text-slate-500">{job.company}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                    {job.type}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                    {job.badge}
                  </span>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/50 p-5 text-center">
              <p className="text-sm font-medium text-indigo-700">
                Bangun jembatan antara institusi Anda dan dunia kerja.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Alumni Networking                                                    */
/* ------------------------------------------------------------------ */

const NETWORK_ITEMS = [
  { icon: Search, label: 'Cari alumni berdasarkan jurusan, angkatan, atau industri' },
  { icon: Globe, label: 'Filter alumni berdasarkan provinsi & kota' },
  { icon: Users, label: 'Lihat profil publik alumni yang sudah terhubung' },
  { icon: Network, label: 'Kirim & terima permintaan koneksi' },
  { icon: Shield, label: 'Blokir & laporkan pengguna tidak pantas' },
  { icon: Briefcase, label: 'Lihat detail karier & perusahaan alumni' },
]

function AlumniNetworking() {
  return (
    <section id="alumni-network" className="bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Alumni Network"
            title="Bangun Jejaring Alumni yang Bermakna"
            description="Alumni dapat menemukan, terhubung, dan berjejaring satu sama lain — tanpa kompleksitas fitur chat."
          />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {NETWORK_ITEMS.map((item, i) => (
              <Reveal
                key={item.label}
                delay={i * 50}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-indigo-200"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <item.icon className="size-4.5" />
                </div>
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={150}>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase">Alumni Directory</p>
            <div className="mt-4 space-y-3">
              {[
                { name: 'Siti Rahmawati', dept: 'Teknik Informatika', year: '2022', status: 'connected' },
                { name: 'Budi Santoso', dept: 'Manajemen Bisnis', year: '2021', status: 'pending' },
                { name: 'Dewi Anggraini', dept: 'Sistem Informasi', year: '2023', status: 'none' },
              ].map((a) => (
                <div key={a.name} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
                    {a.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{a.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {a.dept} · Angkatan {a.year}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                      a.status === 'connected' && 'bg-emerald-50 text-emerald-600',
                      a.status === 'pending' && 'bg-amber-50 text-amber-600',
                      a.status === 'none' && 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {a.status === 'connected' ? 'Terhubung' : a.status === 'pending' ? 'Menunggu' : 'Koneksi'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-center">
              <p className="text-sm font-medium text-indigo-700">
                Cari & hubungkan dengan alumni dari berbagai angkatan.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}



/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    q: 'Apa itu TracerConnect?',
    a: 'TracerConnect adalah platform tracer study dan alumni engagement untuk sekolah, kampus, dan lembaga pendidikan — dari pengelolaan data alumni, pembuatan kuisioner, hingga analisis dan laporan.',
  },
  {
    q: 'Siapa yang dapat menggunakan?',
    a: 'SMK, SMA, universitas, politeknik, lembaga pendidikan, dan organisasi alumni dapat menggunakan TracerConnect untuk mengelola tracer study mereka.',
  },
  {
    q: 'Apakah alumni perlu aplikasi mobile?',
    a: 'Tidak wajib. Alumni dapat mengisi kuisioner lewat aplikasi mobile, tautan web, atau keduanya — sesuai kenyamanan mereka.',
  },
  {
    q: 'Apakah kuisioner dapat dibuat sendiri?',
    a: 'Ya. Anda dapat membuat kuisioner sendiri dengan berbagai tipe pertanyaan, section, dan logika kondisional tanpa perlu menulis kode.',
  },
  {
    q: 'Apakah data dapat diekspor?',
    a: 'Ya. Data alumni dan hasil survey dapat diekspor ke CSV, Excel, dan laporan PDF yang siap dipresentasikan.',
  },
  {
    q: 'Apakah mendukung multi-institusi?',
    a: 'Ya. Setiap institusi memiliki data yang terisolasi dengan aman, dan super admin dapat mengelola banyak institusi sekaligus.',
  },
  {
    q: 'Apakah dapat di-deploy ke shared hosting?',
    a: 'Ya. TracerConnect dirancang kompatibel dengan shared hosting tanpa membutuhkan VPS, Docker, atau infrastruktur khusus.',
  },
]

function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="FAQ"
          title="Pertanyaan yang Sering Diajukan"
          description="Belum menemukan jawaban? Hubungi tim kami — kami siap membantu."
        />
        <div className="mt-12 space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = open === i
            return (
              <Reveal key={faq.q} delay={i * 40}>
                <div
                  className={clsx(
                    'overflow-hidden rounded-2xl border bg-white transition-colors',
                    isOpen ? 'border-indigo-200 shadow-md shadow-indigo-100' : 'border-slate-200',
                  )}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-900">{faq.q}</span>
                    <span
                      className={clsx(
                        'flex size-7 shrink-0 items-center justify-center rounded-full transition-all',
                        isOpen ? 'rotate-180 bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      <ChevronDown className="size-4" />
                    </span>
                  </button>
                  <div
                    className={clsx(
                      'grid transition-all duration-300 ease-out',
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                           */
/* ------------------------------------------------------------------ */

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-800 px-6 py-14 text-center shadow-2xl shadow-indigo-600/30 sm:px-16">
            <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-indigo-400/20 blur-2xl" />
            <Logo className="mx-auto size-10" alt="Logo TracerConnect" />
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Mulai Kelola Tracer Study dengan Lebih Terstruktur.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-indigo-100">
              Bergabunglah dengan institusi lain yang telah merapikan proses tracer study mereka
              bersama TracerConnect.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-[15px] font-semibold text-indigo-700 shadow-lg transition-all hover:bg-indigo-50"
              >
                Minta Demo <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
              >
                Masuk
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export function LandingSections() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Problem />
      <Solution />
      <FeatureShowcase />
      <Workflow />
      <AnalyticsPreview />
      <CareerCenter />
      <AlumniNetworking />
      <MobilePreview />
      <Faq />
      <FinalCta />
    </>
  )
}
