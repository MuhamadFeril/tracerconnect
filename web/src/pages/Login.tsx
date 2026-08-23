import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Info, Lock, Mail } from 'lucide-react'
import { apiError } from '../lib/api'
import { rateLimiter } from '../lib/rateLimiter'
import { hasAdminRole, setSession } from '../lib/auth'
import { useLogin } from '../hooks/queries'
import { Button } from '../components/ui/Button'
import { AuthLayout } from '../components/auth/AuthLayout'
import { GoogleErrorNotice } from '../components/auth/GoogleErrorNotice'
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { LagLoader } from '../components/ui/StateViews'

function Label({ label, htmlFor }: { label: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-bold tracking-wide text-slate-800 uppercase">
      {label}
    </label>
  )
}

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  // Countdown timer for rate-limit cooldown.
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => {
      const remaining = rateLimiter.cooldown('auth/login')
      setCooldown(remaining)
    }, 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const data = await login.mutateAsync({ email, password })
      setSession(data.token, data.user)
      // Employers only manage their own vacancies and applicants, so they
      // land on their own portal instead of the school-admin dashboard.
      const target = data.user?.roles?.includes('employer') ? '/employer' : hasAdminRole(data.user) ? from : '/home'
      navigate(target, { replace: true })
    } catch (err) {
      const msg = apiError(err)
      setError(msg)
      // If the error came from the rate limiter, start the visual countdown.
      const remaining = rateLimiter.cooldown('auth/login')
      if (remaining > 0) setCooldown(remaining)
    }
  }


  return (
    <AuthLayout>
      <div className="relative animate-scale-in overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-7 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-8">
        {/* Gradient accent bar */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-400" />

        {/* "Lag" loading overlay while signing in */}
        {login.isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/85 backdrop-blur-sm">
            <LagLoader label="Lagi nge-lag nih, nyambungin…" />
          </div>
        )}

        {/* Heading */}
        <div className="text-center sm:text-left">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/30 sm:mx-0">
            <Lock className="size-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Selamat Datang Kembali</h1>
          <p className="mt-1.5 text-sm text-slate-500">Masuk untuk melanjutkan ke dashboard Anda.</p>
        </div>

        <form onSubmit={onSubmit} className="mt-7 space-y-5">
          {/* Email */}
          <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <Label label="Email" htmlFor="login-email" />
            <div className="relative mt-2 group">
              <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600" />
              <input
                type="email"
                id="login-email"
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

          {/* Password */}
          <div className="animate-fade-in-up" style={{ animationDelay: '230ms' }}>
            <div className="flex items-center justify-between">
              <Label label="Password" htmlFor="login-password" />
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-500"
              >
                Lupa password?
              </Link>
            </div>
            <div className="relative mt-2 group">
              <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-10.5 pl-10.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex animate-fade-in-up items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              <Info className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full text-[15px]"
            loading={login.isPending}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Tunggu ${cooldown}s` : <>{'Masuk'} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></>}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                atau masuk dengan
              </span>
            </div>
          </div>

          <GoogleSignInButton />

          <GoogleErrorNotice />
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Belum punya akun?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
