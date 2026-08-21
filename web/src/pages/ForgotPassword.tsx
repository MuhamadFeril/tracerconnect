import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, KeyRound, Mail, Send } from 'lucide-react'
import { api, apiError } from '../lib/api'
import { rateLimiter } from '../lib/rateLimiter'
import { Button } from '../components/ui/Button'
import { AuthLayout } from '../components/auth/AuthLayout'

function Label({ label, htmlFor }: { label: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-bold tracking-wide text-slate-800 uppercase">
      {label}
    </label>
  )
}

export function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(rateLimiter.cooldown('auth/forgot-password')), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      const msg = apiError(err)
      setError(msg)
      const remaining = rateLimiter.cooldown('auth/forgot-password')
      if (remaining > 0) setCooldown(remaining)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="relative animate-scale-in overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-7 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-8">
        {/* Gradient accent bar */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-400" />
        {sent ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex size-14 animate-scale-in items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Kode OTP Terkirim</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              Jika email terdaftar, kode OTP reset password telah dikirim. Silakan periksa kotak masuk
              (dan folder spam) Anda, lalu masukkan kode beserta password baru.
            </p>
            <button
              onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500"
            >
              Masukkan Kode OTP
            </button>
            <Link
              to="/login"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-500"
            >
              <ArrowLeft className="size-4" /> Kembali ke login
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center sm:text-left">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/30 sm:mx-0">
                <KeyRound className="size-6" />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Reset Password</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Masukkan email akun Anda — kami akan mengirimkan link untuk mengatur ulang password.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-7 space-y-5">
              <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <Label label="Email" htmlFor="forgot-email" />
                <div className="group relative mt-2">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600" />
                  <input
                    type="email"
                    id="forgot-email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@sekolah.sch.id"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pr-3 pl-10.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="animate-fade-in-up rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" loading={loading} disabled={cooldown > 0}>
                {cooldown > 0 ? `Tunggu ${cooldown}s` : <><Send className="size-4" /> Kirim Link Reset</>}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-500"
                >
                  <ArrowLeft className="size-3.5" /> Kembali ke login
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
