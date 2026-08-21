import { useState } from 'react'
import clsx from 'clsx'
import { KeyRound, Mail, Send } from 'lucide-react'
import { apiError } from '../../lib/api'
import {
  useChangePasswordWithOtp,
  useSendPasswordChangeOtp,
  useUpdatePassword,
} from '../../hooks/queries'
import { Field, Input } from '../ui/Field'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'

type Mode = 'current' | 'otp'

/**
 * Reusable change-password form with two modes:
 * - "Password lama" — verify the current password (PUT /auth/password).
 * - "Via Email (OTP)" — verify an email OTP instead, so users who forgot
 *   their current password (or signed up via Google) can still rotate it.
 */
export function PasswordChangeForm({ email }: { email?: string | null }) {
  const toast = useToast()
  const updatePassword = useUpdatePassword()
  const sendOtp = useSendPasswordChangeOtp()
  const changeWithOtp = useChangePasswordWithOtp()

  const [mode, setMode] = useState<Mode>('current')
  const [pass, setPass] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setPassField = (key: keyof typeof pass, value: string) =>
    setPass((p) => ({ ...p, [key]: value }))

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setOtp('')
    setOtpSent(false)
  }

  const handleSendOtp = async () => {
    setError(null)
    try {
      await sendOtp.mutateAsync()
      setOtpSent(true)
      toast('Kode OTP telah dikirim ke email Anda')
    } catch (err) {
      setError(apiError(err))
    }
  }

  const resetPass = () => setPass({ current_password: '', password: '', password_confirmation: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (pass.password !== pass.password_confirmation) {
      setError('Konfirmasi password baru tidak cocok')
      return
    }

    try {
      if (mode === 'current') {
        await updatePassword.mutateAsync(pass)
      } else {
        if (!otp || otp.length !== 6) {
          setError('Masukkan kode OTP 6 digit')
          return
        }
        await changeWithOtp.mutateAsync({
          otp,
          password: pass.password,
          password_confirmation: pass.password_confirmation,
        })
        setOtp('')
        setOtpSent(false)
      }
      resetPass()
      toast('Password berhasil diubah')
    } catch (err) {
      setError(apiError(err))
    }
  }

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      onClick={() => switchMode(value)}
      className={clsx(
        'flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
        mode === value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
      )}
    >
      {label}
    </button>
  )

  return (
    <form id="password-form" onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Mode switch */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Metode ganti password">
        {tab('current', 'Dengan password lama')}
        {tab('otp', 'Via email (OTP)')}
      </div>

      {/* Hidden username field so password managers can associate the form. */}
      <input type="text" name="username" value={email ?? ''} autoComplete="username" hidden readOnly />

      {mode === 'current' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Password Saat Ini" required>
            <Input
              type="password"
              required
              name="current_password"
              value={pass.current_password}
              onChange={(e) => setPassField('current_password', e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Field>
          <Field label="Password Baru" required hint="Minimal 8 karakter">
            <Input
              type="password"
              required
              minLength={8}
              name="password"
              value={pass.password}
              onChange={(e) => setPassField('password', e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Konfirmasi Password Baru" required>
            <Input
              type="password"
              required
              name="password_confirmation"
              value={pass.password_confirmation}
              onChange={(e) => setPassField('password_confirmation', e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3.5 py-2.5 text-xs text-slate-600">
            <Mail className="mr-1.5 inline size-3.5 text-indigo-500" />
            Kode OTP akan dikirim ke{' '}
            <span className="font-semibold text-slate-800">{email || 'email Anda'}</span> — tanpa perlu
            password lama.
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Kode OTP" required hint={otpSent ? 'Periksa kotak masuk (dan spam) email Anda.' : 'Klik Kirim Kode untuk mengirim OTP.'}>
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  required
                  name="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  autoComplete="one-time-code"
                  className="font-mono tracking-[0.2em]"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSendOtp}
                  loading={sendOtp.isPending}
                  disabled={otpSent && !sendOtp.isPending}
                  className="shrink-0"
                >
                  <Send className="size-3.5" />
                  {otpSent ? 'Kirim Ulang' : 'Kirim Kode'}
                </Button>
              </div>
            </Field>
            <Field label="Password Baru" required hint="Minimal 8 karakter">
              <Input
                type="password"
                required
                minLength={8}
                name="password"
                value={pass.password}
                onChange={(e) => setPassField('password', e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Konfirmasi Password Baru" required>
              <Input
                type="password"
                required
                name="password_confirmation"
                value={pass.password_confirmation}
                onChange={(e) => setPassField('password_confirmation', e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" form="password-form" loading={updatePassword.isPending || changeWithOtp.isPending}>
          <KeyRound className="size-4" /> {mode === 'otp' ? 'Ubah dengan OTP' : 'Ubah Password'}
        </Button>
      </div>
    </form>
  )
}
