import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Info } from 'lucide-react'

/**
 * Map the raw Google OAuth error codes that the backend forwards via
 * `?google_error=` to friendly, actionable Indonesian messages.
 */
const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    'Login Google dibatalkan atau ditolak. Silakan coba lagi, atau gunakan email & password.',
  invalid_state: 'Sesi login Google kedaluwarsa. Silakan coba login lagi.',
  callback_failed: 'Gagal menghubungkan ke Google. Periksa koneksi internet Anda lalu coba lagi.',
  invalid_token: 'Token Google tidak valid. Silakan coba login lagi.',
  not_configured: 'Login Google belum tersedia. Gunakan email & password untuk masuk.',
  redirect_uri_mismatch:
    'Konfigurasi login Google belum sesuai. Gunakan email & password untuk masuk, atau hubungi admin.',
  disabled_uri:
    'Login Google belum diizinkan. Gunakan email & password untuk masuk.',
  inactive_scope:
    'Izin Google belum lengkap. Gunakan email & password untuk masuk.',
  invalid_client:
    'Login Google sedang tidak tersedia. Gunakan email & password untuk masuk.',
}

/** Friendly label for the "Akun ini telah dihapus/dinonaktifkan" backend errors. */
const GENERIC_FALLBACK =
  'Login Google gagal. Gunakan email & password untuk masuk, atau hubungi admin.'

/**
 * Shows the `?google_error=` reason (if any) on the auth pages. Google bounces
 * the user back here after a failed sign-in, so the reason must be read from
 * the URL — it is not something the login form itself knows about.
 */
export function GoogleErrorNotice() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = searchParams.get('google_error')
    if (!raw) {
      setError(null)
      return
    }
    setError(GOOGLE_ERROR_MESSAGES[raw] ?? GENERIC_FALLBACK)

    // Strip the param after showing it so a refresh doesn't re-show the error.
    const url = new URL(window.location.href)
    if (url.searchParams.has('google_error')) {
      url.searchParams.delete('google_error')
      window.history.replaceState({}, '', url)
    }
  }, [searchParams])

  if (!error) return null

  return (
    <div className="flex animate-fade-in-up items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
      <Info className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">Login Google gagal</p>
        <p className="mt-0.5 text-[13px] leading-relaxed">{error}</p>
      </div>
    </div>
  )
}
