import { Link } from 'react-router-dom'
import { ArrowLeft, BarChart3, FileText, ShieldCheck, Users } from 'lucide-react'
import clsx from 'clsx'
import { Logo } from '../ui/Logo'

const BRAND_FEATURES = [
  {
    icon: Users,
    title: 'Database Alumni Terpusat',
    desc: 'Data alumni tersimpan rapi dalam satu platform.',
  },
  {
    icon: BarChart3,
    title: 'Tracer Study & Analitik',
    desc: 'Pantau respons dan tren alumni secara real-time.',
  },
  {
    icon: FileText,
    title: 'Laporan Siap Pakai',
    desc: 'Ekspor PDF & CSV siap untuk akreditasi.',
  },
  {
    icon: ShieldCheck,
    title: 'Keamanan Berlapis',
    desc: 'Hak akses per role & data terisolasi per institusi.',
  },
]

/**
 * Shared shell for the auth pages (login, forgot/reset password, register):
 * an animated split-screen with a navy brand panel on the left (desktop
 * only) and the page's form on the right. Pass `wide` for taller forms like
 * the multi-step register page so the form column gets more room.
 */
export function AuthLayout({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Ambient animated blobs behind everything */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 size-[28rem] animate-blob rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="absolute top-1/3 -right-32 size-96 animate-blob rounded-full bg-sky-200/40 blur-3xl [animation-delay:-5s]" />
        <div className="absolute -bottom-24 left-1/4 size-80 animate-blob rounded-full bg-indigo-100/60 blur-3xl [animation-delay:-10s]" />
      </div>

      <div
        className={clsx(
          'relative z-10 mx-auto flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8',
          wide ? 'max-w-7xl' : 'max-w-6xl',
        )}
      >
        {/* Top bar */}
        <header className="flex animate-fade-in-down items-center justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <Logo className="size-10 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-tight text-slate-900">TracerAlumni</p>
              <p className="hidden truncate text-[11px] text-slate-400 sm:block">Tracer Study & Alumni</p>
            </div>
          </Link>
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="size-3.5" />
            Beranda
          </Link>
        </header>

        <div className={clsx('flex flex-1 items-center py-8 lg:py-12', wide ? 'gap-8 lg:gap-10' : 'gap-10')}>
          {/* Brand panel — desktop only. In wide mode (register) it only
              appears from xl so the wide form column never crushes it. */}
          <aside className={clsx('hidden flex-1 animate-fade-in-up', wide ? 'xl:block' : 'lg:block')}>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-700 p-10 text-white shadow-2xl shadow-indigo-900/30">
              {/* Animated blobs inside the panel */}
              <div aria-hidden="true" className="absolute inset-0">
                <div className="absolute -top-20 -right-16 size-72 animate-blob rounded-full bg-indigo-500/30 blur-3xl" />
                <div className="absolute -bottom-16 -left-16 size-64 animate-blob rounded-full bg-sky-400/20 blur-3xl [animation-delay:-7s]" />
                <div className="absolute top-1/2 left-1/2 size-40 animate-float-slow rounded-full bg-white/5 blur-2xl" />
              </div>

              <div className="relative">
                <Logo className="size-12" />
                <h2 className="mt-8 text-3xl leading-tight font-bold tracking-tight">
                  Kelola tracer study alumni lebih mudah &amp; terukur.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-indigo-100/90">
                  Satu platform untuk data alumni, kuesioner dinamis, respons, analitik, dan laporan otomatis.
                </p>

                <ul className="mt-9 space-y-4">
                  {BRAND_FEATURES.map((feature, i) => (
                    <li
                      key={feature.title}
                      className="flex animate-fade-in-up items-start gap-3"
                      style={{ animationDelay: `${250 + i * 120}ms` }}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                        <feature.icon className="size-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{feature.title}</p>
                        <p className="mt-0.5 text-xs text-indigo-200/80">{feature.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur">
                  <div className="flex -space-x-2">
                    {['SM', 'PT', 'K', 'P'].map((label, i) => (
                      <div
                        key={label}
                        className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-[10px] font-bold ring-2 ring-indigo-900"
                        style={{ zIndex: 4 - i }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs leading-snug text-indigo-100/90">
                    Dipercaya sekolah, kampus, dan lembaga pendidikan di seluruh Indonesia.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Form side */}
          <main
            className={clsx(
              'mx-auto w-full flex-1 animate-fade-in-up lg:mx-0 lg:flex-none',
              wide ? 'max-w-3xl' : 'max-w-md',
            )}
            style={{ animationDelay: '120ms' }}
          >
            {/* Compact brand panel — small screens only. Hidden exactly when
                the full side panel is visible, so the brand identity is never
                lost on mobile. */}
            <div className={clsx('mb-6', wide ? 'xl:hidden' : 'lg:hidden')}>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-700 px-5 py-4 text-white shadow-lg shadow-indigo-900/20">
                {/* Animated blobs inside the compact panel */}
                <div aria-hidden="true" className="absolute inset-0">
                  <div className="absolute -top-10 -right-8 size-40 animate-blob rounded-full bg-indigo-500/30 blur-3xl" />
                  <div className="absolute -bottom-10 -left-8 size-32 animate-blob rounded-full bg-sky-400/20 blur-3xl [animation-delay:-7s]" />
                </div>
                <div className="relative flex items-center gap-2.5">
                  <Logo className="size-8 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold tracking-tight">TracerAlumni</p>
                    <p className="truncate text-[10px] text-indigo-200/80">Tracer Study & Alumni</p>
                  </div>
                </div>
                <h2 className="relative mt-2.5 text-[15px] leading-snug font-bold tracking-tight">
                  Kelola tracer study alumni lebih mudah &amp; terukur.
                </h2>
                <p className="relative mt-1 text-[11px] leading-relaxed text-indigo-100/90">
                  Data alumni, kuesioner, respons, analitik, dan laporan — satu platform.
                </p>
              </div>
            </div>

            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
