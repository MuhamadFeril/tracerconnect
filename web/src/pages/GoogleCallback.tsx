import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, unwrap } from '../lib/api'
import { clearSession, hasAdminRole, setSession, setToken } from '../lib/auth'
import type { User } from '../lib/types'

/**
 * Landing page for the Google OAuth redirect flow. The backend exchanges the
 * Google authorization code, creates/logs in the user, and redirects the
 * browser here with `?auth_code=...`. We exchange the auth code for a token,
 * fetch the fresh profile, then route by role — new Google users go to the
 * biodata form first.
 */
export function GoogleCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [, setProcessing] = useState(true)

  useEffect(() => {
    const authCode = searchParams.get('auth_code')
    if (!authCode) {
      setError('Login Google gagal — kode otorisasi tidak ditemukan. Silakan coba lagi.')
      setProcessing(false)
      return
    }

    let active = true

    // Exchange the short-lived auth code for the actual Sanctum token.
    api
      .post('/auth/google/exchange', { auth_code: authCode })
      .then((res) => {
        if (!active) return

        // Surface the exact backend failure instead of a generic message.
        if (res.data?.success === false) {
          clearSession()
          setError(res.data?.message || 'Login Google gagal. Silakan coba lagi.')
          setProcessing(false)
          return
        }

        const data = res.data?.data
        const token = data?.token
        const isNewGoogleUser = Boolean(data?.new_google_user)
        const profileComplete = data?.profile_complete ?? true

        // New Google users without token — legacy flow (biodata + OTP required).
        if (!token) {
          const email = data?.email
          const regToken = data?.registration_token

          if (!email || !regToken) {
            clearSession()
            setError('Login Google gagal — data registrasi tidak lengkap. Silakan coba lagi.')
            setProcessing(false)
            return
          }

          if (!active) return
          navigate('/register?google=1', {
            replace: true,
            state: { email, name: data?.name ?? '', registration_token: regToken },
          })
          return
        }

        setToken(token)

        return unwrap<User>(api.get('/auth/me')).then((user) => {
          if (!active) return
          setSession(token, user)

          // Akun Google baru / profil belum lengkap (mis. habis hapus akun
          // lalu login Google lagi yang auto-bikin akun fresh tanpa
          // institusi) wajib isi biodata dulu, jangan langsung dashboard.
          const needsBiodata =
            isNewGoogleUser || profileComplete === false || !(user as any)?.institution_id
          if (needsBiodata) {
            navigate('/register?google=1', {
              replace: true,
              state: {
                email: (user as any)?.email ?? '',
                name: (user as any)?.name ?? '',
                // Wajib: complete-registration adalah rute publik, auth-nya
                // hanya lewat registration_token ini (Bearer token tidak dibaca).
                registration_token: (data as any)?.registration_token ?? undefined,
              },
            })
            return
          }

          // Existing fully-registered Google users go straight to the app.
          const target = user.roles?.includes('hrd') ? '/hrd' : hasAdminRole(user) ? '/dashboard' : '/home'
          navigate(target, { replace: true })
        })
      })
      .catch((err: any) => {
        if (!active) return
        clearSession()
        // Prefer the backend's message when present (e.g. expired/invalid code).
        const msg =
          err?.response?.data?.message ||
          'Sesi Google tidak valid. Silakan coba login lagi.'
        setError(msg)
        setProcessing(false)
      })

    return () => {
      active = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      {error ? (
        <div className="animate-fade-in-up flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-rose-50">
            <svg className="size-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="max-w-xs text-sm font-medium text-rose-600">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-colors hover:bg-indigo-500"
          >
            Kembali ke Login
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {/* Branded loading spinner */}
          <div className="relative size-14">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-lg shadow-indigo-600/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-extrabold text-white">TC</span>
            </div>
            <svg className="absolute -inset-1 size-[calc(100%+8px)] animate-spin" viewBox="0 0 56 56">
              <circle
                cx="28" cy="28" r="24"
                fill="none" stroke="currentColor"
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray="120 60"
                className="text-indigo-300"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-500">Menyelesaikan login Google…</p>
        </div>
      )}
    </div>
  )
}
