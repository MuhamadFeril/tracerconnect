import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getSessionExpiresAt, isAuthenticated } from '../lib/auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()

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

  return <>{children}</>
}
