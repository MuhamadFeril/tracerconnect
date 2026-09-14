import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '../lib/api'
import { clearSession, getSessionExpiresAt, getUser, isAuthenticated } from '../lib/auth'
import type { User } from '../lib/types'

function needsBiodata(user: User | null | undefined): boolean {
  if (!user) return false
  // Hanya akun alumni yang wajib punya institusi/biodata.
  // HRD cross-school dan admin platform memang institution_id null by design.
  if (!user.roles?.includes('alumni')) return false
  return !user.institution_id
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const authed = isAuthenticated()
  const cachedUser = getUser()

  // Data fresh dari server — menutup celah cache basi (mis. user baru
  // hasil login Google yang auto-bikin akun tanpa institusi).
  const me = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => unwrap<User>(api.get('/auth/me')),
    staleTime: 60_000,
    retry: false,
    enabled: authed,
  })

  // Sign out automatically the moment the 1-hour session window elapses,
  // even if the tab has been idle (no API call to trigger the 401 flow).
  useEffect(() => {
    const expiresAt = getSessionExpiresAt()
    if (expiresAt === null) return

    const delay = Math.max(0, expiresAt - Date.now())
    const id = window.setTimeout(() => {
      clearSession()
      navigate('/login', { replace: true })
    }, delay)

    return () => window.clearTimeout(id)
  }, [location.pathname, navigate])

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Jika tidak ada akunnya (akun fresh tanpa institusi — mis. habis hapus
  // akun lalu login Google lagi) → wajib isi data dulu, jangan ke dashboard.
  const freshUser = me.data ?? undefined
  const targetUser = freshUser ?? cachedUser
  if (needsBiodata(cachedUser) || needsBiodata(freshUser)) {
    return (
      <Navigate
        to="/register?google=1"
        state={{ email: targetUser?.email ?? '', name: targetUser?.name ?? '' }}
        replace
      />
    )
  }

  return <>{children}</>
}
