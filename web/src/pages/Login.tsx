import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { apiError } from '../lib/api'
import { hasAdminRole, setSession } from '../lib/auth'
import { useLogin } from '../hooks/queries'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

function GoogleLogo() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
      />
    </svg>
  )
}

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

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const data = await login.mutateAsync({ email, password })
      setSession(data.token, data.user)
      navigate(hasAdminRole(data.user) ? from : '/home', { replace: true })
    } catch (err) {
      setError(apiError(err))
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
            to="/register"
            className="shrink-0 text-[13px] font-medium whitespace-nowrap text-slate-500 transition-colors hover:text-slate-900"
          >
            <span className="hidden sm:inline">Belum punya akun? </span>Daftar →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Masuk ke Akun Anda
          </h1>
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500">
            Alumni &amp; Admin
          </span>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Lock className="size-5" />
            </div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">Selamat Datang Kembali</h2>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 px-6 py-6">
            <div>
              <Label label="Email" htmlFor="login-email" />
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@sekolah.sch.id"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label label="Password" htmlFor="login-password" />
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Lupa password?
                </Link>
              </div>
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full text-[15px]" loading={login.isPending}>
              Masuk <ArrowRight className="size-4" />
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

            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <GoogleLogo /> Login dengan Google
            </Button>
          </form>
        </section>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-500 shadow-sm">
          <p className="font-semibold text-slate-700">Akun demo:</p>
          <p className="mt-1">
            Super Admin — <code className="text-indigo-600">superadmin@tracerconnect.test</code>
          </p>
          <p>
            Institution Admin — <code className="text-indigo-600">admin@smkn1tracer.sch.id</code>
          </p>
          <p className="text-slate-400">Password: <code>password</code></p>
        </div>
      </main>
    </div>
  )
}
