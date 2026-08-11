import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import { api, apiError } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

function Label({ label, htmlFor, required }: { label: string; htmlFor: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-bold tracking-wide text-slate-800 uppercase">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
  )
}

function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  show,
  onToggleShow,
  icon,
}: {
  id: string
  name: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  show: boolean
  onToggleShow: () => void
  icon: React.ReactNode
}) {
  return (
    <div className="relative mt-2">
      {icon}
      <input
        type={show ? 'text' : 'password'}
        id={id}
        name={name}
        autoComplete="new-password"
        required
        minLength={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
        aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmation) {
      setError('Konfirmasi password tidak cocok')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: confirmation,
      })
      setDone(true)
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Atur Ulang Password
          </h1>
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500">
            Pemulihan Akun
          </span>
        </div>

        {done ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
              Password Berhasil Diubah
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              Password Anda telah direset. Silakan masuk dengan password baru.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Masuk Sekarang
            </Link>
          </section>
        ) : !token || !email ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-500">
              <KeyRound className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900">Tautan Tidak Valid</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              Tautan reset password tidak lengkap. Silakan minta tautan baru.
            </p>
            <Link
              to="/forgot-password"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Minta Tautan Baru
            </Link>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <KeyRound className="size-5" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">Password Baru</h2>
            </div>

            <form onSubmit={onSubmit} className="space-y-5 px-6 py-6">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                Mengubah password untuk{' '}
                <span className="font-semibold text-slate-700">{email}</span>
              </div>

              <div>
                <Label label="Password Baru" htmlFor="reset-password" required />
                <PasswordInput
                  id="reset-password"
                  name="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Buat password"
                  show={showPassword}
                  onToggleShow={() => setShowPassword((v) => !v)}
                  icon={<Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />}
                />
                <p className="mt-1.5 text-xs text-slate-400 italic">minimal 8 karakter</p>
              </div>

              <div>
                <Label label="Konfirmasi Password Baru" htmlFor="reset-confirmation" required />
                <PasswordInput
                  id="reset-confirmation"
                  name="password_confirmation"
                  value={confirmation}
                  onChange={setConfirmation}
                  placeholder="Ulangi password"
                  show={showConfirmation}
                  onToggleShow={() => setShowConfirmation((v) => !v)}
                  icon={<ShieldCheck className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />}
                />
                <p className="mt-1.5 text-xs text-slate-400 italic">ulangi password yang sama</p>
              </div>

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Simpan Password Baru
              </Button>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}
