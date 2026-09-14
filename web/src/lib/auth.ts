import type { User } from './types'

const TOKEN_KEY = 'tc_token'
const USER_KEY = 'tc_user'
const EXPIRES_AT_KEY = 'tc_session_expires_at'

/**
 * Web session lifetime (1 hour). After this window elapses the user is
 * signed out and must log in again, even if the tab has been idle.
 * The backend token itself is unchanged (still valid for 7 days), so the
 * mobile app is not affected.
 */
export const SESSION_TTL_MS = 60 * 60 * 1000

/**
 * Roles that land on the admin dashboard after login. Everyone else
 * (e.g. alumni) is sent to the profile page.
 */
export const ADMIN_ROLES = [
  'admin_institusi',
  'hrd',
]

export function hasAdminRole(user: User | null | undefined): boolean {
  return Boolean(user?.roles?.some((role) => ADMIN_ROLES.includes(role)))
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function setSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + SESSION_TTL_MS))
}

/** Persist a token without touching the cached user (used by the Google
 *  OAuth callback before it fetches the full profile). */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + SESSION_TTL_MS))
}

export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/** Absolute epoch-millis when the web session expires, or null when unset. */
export function getSessionExpiresAt(): number | null {
  const raw = localStorage.getItem(EXPIRES_AT_KEY)
  if (!raw) return null
  const ts = Number(raw)
  return Number.isFinite(ts) ? ts : null
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(EXPIRES_AT_KEY)
}

/**
 * Bridge state for a brand-new Google user who has NOT finished registration
 * yet. Because they get no API token until biodata + OTP are done, we stash
 * the verified email / name and the Google ID token (needed to authenticate
 * the `complete-registration` call) here instead of in the normal session.
 */
const GOOGLE_REG_KEY = 'tc_google_registration'

export interface GoogleRegistrationDraft {
  email: string
  name: string
  registration_token: string
}

export function setGoogleRegistration(draft: GoogleRegistrationDraft): void {
  localStorage.setItem(GOOGLE_REG_KEY, JSON.stringify(draft))
}

export function getGoogleRegistration(): GoogleRegistrationDraft | null {
  try {
    const raw = localStorage.getItem(GOOGLE_REG_KEY)
    return raw ? (JSON.parse(raw) as GoogleRegistrationDraft) : null
  } catch {
    return null
  }
}

export function clearGoogleRegistration(): void {
  localStorage.removeItem(GOOGLE_REG_KEY)
}

export function isAuthenticated(): boolean {
  if (!getToken()) return false

  const expiresAt = getSessionExpiresAt()
  if (expiresAt === null) {
    // Legacy session stored before the expiry feature landed: keep the user
    // signed in but stamp a fresh 1-hour window so the new rule applies
    // from now on.
    localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + SESSION_TTL_MS))
    return true
  }

  if (Date.now() >= expiresAt) {
    clearSession()
    return false
  }

  return true
}

/**
 * Security: Validate that the current origin matches expected origins
 * to prevent token leakage on unexpected domains.
 * Call this on app initialization.
 */
export function validateOrigin(expectedOrigins: string[]): boolean {
  const currentOrigin = window.location.origin
  return expectedOrigins.includes(currentOrigin)
}

/**
 * Security: Secure token accessor that validates origin before returning token.
 * Use this for sensitive API calls instead of getToken() directly.
 */
export function getSecureToken(expectedOrigins: string[]): string | null {
  if (!validateOrigin(expectedOrigins)) {
    clearSession()
    return null
  }
  return getToken()
}
