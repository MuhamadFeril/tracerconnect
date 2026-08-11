import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react'
import { api, apiError } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

function Label({ label, htmlFor }: { label: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-bold tracking-wide text-slate-800 uppercase">
      {label}
    </label>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <Logo className="size-10 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-tight text-slate-900">TracerConnect</p>
              <p className="hidden truncate text-[11px] text-slate-400 sm:block">Tracer Study & Alumni</p>
            </div>
          </Link>
          <Link
            to="/login"
            className="shrink-0 text-[13px] font-medium whitespace-nowrap text-slate-500 transition-colors hover:text-slate-900"
          >
            <span className="hidden sm:inline">Sudah punya akun? </span>Masuk →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Reset Password</h1>
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500">
            Pemulihan Akun
          </span>
        </div>

        {sent ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900">Link Terkirim</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              Jika email terdaftar, link reset password telah dikirim. Silakan periksa kotak masuk
              (dan folder spam) Anda.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-500"
            >
              <ArrowLeft className="size-4" /> Kembali ke login
            </Link>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <KeyRound className="size-5" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">Kirim Link Reset</h2>
            </div>

            <form onSubmit={onSubmit} className="space-y-5 px-6 py-6">
              <div>
                <Label label="Email" htmlFor="forgot-email" />
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    id="forgot-email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@sekolah.sch.id"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400 italic">
                  Masukkan email akun Anda untuk menerima link reset.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Kirim Link Reset
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-500"
                >
                  <ArrowLeft className="size-3.5" /> Kembali ke login
                </Link>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}
