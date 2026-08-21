import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Info } from 'lucide-react'

/**
 * Map the raw Google OAuth error codes that the backend forwards via
 * `?google_error=` to friendly, actionable Indonesian messages.
 */
const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    'Login Google dibatalkan atau ditolak. Jika aplikasi belum terverifikasi, pastikan akun Google Anda terdaftar sebagai Test user di Google Cloud Console (OAuth consent screen), lalu coba lagi.',
  invalid_state: 'Sesi login Google kedaluwarsa. Silakan coba lagi.',
  callback_failed: 'Terjadi kesalahan saat menghubungkan ke Google. Silakan coba lagi.',
  invalid_token: 'Token Google tidak valid atau kedaluwarsa. Silakan coba lagi.',
  not_configured: 'Login Google belum dikonfigurasi di server. Hubungi administrator.',
  redirect_uri_mismatch:
    'Konfigurasi Google tidak cocok. Pastikan redirect URI terdaftar di Google Cloud Console, lalu coba lagi.',
  disabled_uri:
    'Redirect URI Google belum diizinkan. Daftarkan redirect URI di Google Cloud Console, lalu coba lagi.',
  inactive_scope:
    'Beberapa izin Google belum disetujui. Periksa OAuth consent screen di Google Cloud Console.',
  invalid_client:
    'Klien Google tidak valid. Periksa GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET di backend/.env.',
}

/** Friendly label for the "Akun ini telah dihapus/dinonaktifkan" backend errors. */
const GENERIC_FALLBACK =
  'Login Google ditolak. Periksa bahwa aplikasi sudah diverifikasi / dalam mode Production di Google Cloud Console, lalu coba lagi.'

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
        <p className="font-semibold">Google menolak login</p>
        <p className="mt-0.5 text-[13px] leading-relaxed">{error}</p>
      </div>
    </div>
  )
}
