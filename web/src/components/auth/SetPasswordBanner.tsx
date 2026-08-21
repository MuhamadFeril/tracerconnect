import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import { getUser } from '../../lib/auth'

/**
 * Persistent banner for users who signed up via Google and haven't set a
 * password yet. Links to the profile/security page where they can create one.
 * Dismissible per-session (stored in sessionStorage).
 */
export function SetPasswordBanner() {
  const user = getUser()
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('tc_password_banner_dismissed') === 'true',
  )

  if (!user || user.has_password || dismissed) {
    return null
  }

  const dismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('tc_password_banner_dismissed', 'true')
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
          <AlertTriangle className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-800">Anda belum membuat password</p>
          <p className="mt-0.5 text-xs text-amber-600">
            Akun Anda menggunakan login Google. Buat password agar tetap bisa masuk jika suatu saat tidak bisa menggunakan Google.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/profile"
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-500"
          >
            Buat Password
          </Link>
          <button
            onClick={dismiss}
            className="rounded-lg p-1 text-amber-400 transition-colors hover:bg-amber-100 hover:text-amber-600"
            aria-label="Tutup notifikasi"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
