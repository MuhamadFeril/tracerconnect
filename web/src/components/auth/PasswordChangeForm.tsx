import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { apiError } from '../../lib/api'
import { useUpdatePassword } from '../../hooks/queries'
import { Field, Input } from '../ui/Field'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'

/**
 * Change-password form that requires the current password.
 * The OTP / forget-password mode has been removed — users who are
 * already logged in should verify with their existing password.
 */
export function PasswordChangeForm({ email }: { email?: string | null }) {
  const toast = useToast()
  const updatePassword = useUpdatePassword()

  const [pass, setPass] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [error, setError] = useState<string | null>(null)

  const setPassField = (key: keyof typeof pass, value: string) =>
    setPass((p) => ({ ...p, [key]: value }))

  const resetPass = () => setPass({ current_password: '', password: '', password_confirmation: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (pass.password !== pass.password_confirmation) {
      setError('Konfirmasi password baru tidak cocok')
      return
    }

    try {
      await updatePassword.mutateAsync(pass)
      resetPass()
      toast('Password berhasil diubah')
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <form id="password-form" onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Hidden username field so password managers can associate the form. */}
      <input type="text" name="username" value={email ?? ''} autoComplete="username" hidden readOnly />

      <div className="space-y-4">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <div className="flex justify-end">
        <Button type="submit" form="password-form" loading={updatePassword.isPending}>
          <KeyRound className="size-4" /> Ubah Password
        </Button>
      </div>
    </form>
  )
}
