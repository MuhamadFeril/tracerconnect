import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated } from '../lib/auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
