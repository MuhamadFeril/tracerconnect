import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import { api, apiError } from '../lib/api'
import { Button } from '../components/ui/Button'
import { AuthLayout } from '../components/auth/AuthLayout'
import { useResendOtp } from '../hooks/queries'

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
    <div className="group relative mt-2">
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
        className="h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-10.5 pl-10.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none"
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
        aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const resend = useResendOtp()

  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const onResend = async () => {
    setError(null)
    try {
      await resend.mutateAsync({ email, purpose: 'reset' })
    } catch (err) {
      setError(apiError(err))
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!otp || otp.length !== 6) {
      setError('Masukkan kode OTP 6 digit')
      return
    }

    if (password !== confirmation) {
      setError('Konfirmasi password tidak cocok')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        email,
        otp,
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
    <AuthLayout>
      <div className="relative animate-scale-in overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-7 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-8">
        {/* Gradient accent bar */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-400" />
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex size-14 animate-scale-in items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Password Berhasil Diubah</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              Password Anda telah direset. Silakan masuk dengan password baru.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500"
            >
              Masuk Sekarang
            </Link>
          </div>
        ) : !email ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex size-14 animate-scale-in items-center justify-center rounded-full bg-amber-50 text-amber-500">
              <AlertTriangle className="size-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Email Tidak Ditemukan</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              Silakan minta kode OTP reset password terlebih dahulu.
            </p>
            <Link
              to="/forgot-password"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500"
            >
              Minta Kode OTP
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center sm:text-left">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/30 sm:mx-0">
                <KeyRound className="size-6" />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Atur Ulang Password</h1>
              <p className="mt-1.5 text-sm text-slate-500">Buat password baru untuk akun Anda.</p>
            </div>

            <form onSubmit={onSubmit} className="mt-7 space-y-5">
              <div className="animate-fade-in-up rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-2.5 text-xs text-slate-600">
                Mengubah password untuk <span className="font-semibold text-slate-800">{email}</span>
              </div>

              <div className="animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                <Label label="Kode OTP" htmlFor="reset-otp" required />
                <div className="relative mt-2">
                  <input
                    type="text"
                    id="reset-otp"
                    name="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-center font-mono text-xl tracking-[0.4em] text-slate-900 placeholder:text-slate-300 transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resend.isPending}
                  className="mt-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-500 disabled:opacity-50"
                >
                  {resend.isPending ? 'Mengirim ulang…' : 'Kirim ulang kode OTP'}
                </button>
              </div>

              <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                <Label label="Password Baru" htmlFor="reset-password" required />
                <PasswordInput
                  id="reset-password"
                  name="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Buat password"
                  show={showPassword}
                  onToggleShow={() => setShowPassword((v) => !v)}
                  icon={<Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600" />}
                />
                <p className="mt-1.5 text-xs text-slate-400 italic">minimal 8 karakter</p>
              </div>

              <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <Label label="Konfirmasi Password Baru" htmlFor="reset-confirmation" required />
                <PasswordInput
                  id="reset-confirmation"
                  name="password_confirmation"
                  value={confirmation}
                  onChange={setConfirmation}
                  placeholder="Ulangi password"
                  show={showConfirmation}
                  onToggleShow={() => setShowConfirmation((v) => !v)}
                  icon={<ShieldCheck className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600" />}
                />
                <p className="mt-1.5 text-xs text-slate-400 italic">ulangi password yang sama</p>
              </div>

              {error && (
                <div className="animate-fade-in-up rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Simpan Password Baru
              </Button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
