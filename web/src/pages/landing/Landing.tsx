import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArrowRight,
  Download,
  LayoutDashboard,
  Mail,
  Menu,
  X,
} from 'lucide-react'
import { isAuthenticated } from '../../lib/auth'
import { Logo } from '../../components/ui/Logo'
import { LandingSections } from './sections'

const NAV_LINKS = [
  { href: '#fitur', label: 'Fitur' },
  { href: '#cara-kerja', label: 'Cara Kerja' },
  { href: '#alumni-network', label: 'Jejaring' },

  { href: '#faq', label: 'FAQ' },
]

function LandingNavbar() {
  const authed = isAuthenticated()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={clsx(
        'sticky top-0 z-50 animate-fade-in-down transition-all duration-300',
        scrolled || open
          ? 'border-b border-slate-200/70 bg-white/90 shadow-sm backdrop-blur'
          : 'bg-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Utama">
        <a href="#beranda" className="flex min-w-0 items-center gap-3">
          <Logo className="size-10 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold tracking-tight text-slate-900">TracerConnect</p>
            <p className="hidden truncate text-[11px] text-slate-400 sm:block">Tracer Study & Alumni</p>
          </div>
        </a>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-[15px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2.5 lg:flex">
          {authed ? (
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-[15px] font-semibold text-white shadow-md shadow-indigo-600/25 transition-colors hover:bg-indigo-500"
            >
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex h-10 items-center rounded-xl px-4 text-[15px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-[15px] font-semibold text-white shadow-md shadow-indigo-600/25 transition-colors hover:bg-indigo-500"
              >
                Coba Demo <ArrowRight className="size-4" />
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <div
        className={clsx(
          'overflow-hidden border-slate-200/70 bg-white transition-all duration-300 lg:hidden',
          open ? 'max-h-96 border-t' : 'max-h-0',
        )}
      >
        <div className="space-y-1 px-4 py-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-100"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3">
            {authed ? (
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[15px] font-semibold text-white"
              >
                <LayoutDashboard className="size-4" /> Dashboard
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-[15px] font-semibold text-slate-700"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center justify-center rounded-xl bg-indigo-600 text-[15px] font-semibold text-white"
                >
                  Coba Demo
                </Link>
              </div>
            )}
          </div>
          <a
            href="/downloads/app-release.apk"
            download
            onClick={() => setOpen(false)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-900 text-[15px] font-semibold text-slate-900"
          >
            <Download className="size-4" /> Download APK
          </a>
        </div>
      </div>
    </header>
  )
}

function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <Logo className="size-10" />
              <p className="text-[15px] font-bold text-white">TracerConnect</p>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Platform tracer study &amp; alumni engagement untuk sekolah, kampus, dan lembaga
              pendidikan.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-white uppercase">Produk</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                ['Fitur', '#fitur'],
                ['Cara Kerja', '#cara-kerja'],
                ['Jejaring Alumni', '#alumni-network'],
                ['Download APK', '/downloads/app-release.apk'],
              ].map(([label, href]) => (
                <li key={label}>
                  <a href={href} download={href.includes('app-release') ? true : undefined} className="transition-colors hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-white uppercase">Perusahaan</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {['Tentang', 'Blog', 'Karier', 'Kontak'].map((label) => (
                <li key={label}>
                  <a href="#beranda" className="transition-colors hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-white uppercase">Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {['Privasi', 'Syarat & Ketentuan', 'Kebijakan Cookie'].map((label) => (
                <li key={label}>
                  <a href="#beranda" className="transition-colors hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-2 text-sm">
              <Mail className="size-4 text-indigo-400" />
              <a href="mailto:halo@tracerconnect.id" className="transition-colors hover:text-white">
                halo@tracerconnect.id
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-6 text-xs sm:flex-row">
          <p>© {year} TracerConnect. Semua hak dilindungi.</p>
          <p className="flex items-center gap-1.5">
            Dibuat untuk institusi pendidikan di Indonesia
            <span className="text-indigo-400">♥</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

export function Landing() {
  return (
    <div id="beranda" className="bg-white">
      <LandingNavbar />
      <main>
        <LandingSections />
      </main>
      <LandingFooter />
    </div>
  )
}
