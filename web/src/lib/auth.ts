import type { User } from './types'

const TOKEN_KEY = 'tc_token'
const USER_KEY = 'tc_user'

/**
 * Roles that land on the admin dashboard after login. Everyone else
 * (e.g. alumni) is sent to the profile page.
 */
export const ADMIN_ROLES = [
  'super_admin',
  'institution_admin',
  'operator',
  'viewer',
  'survey_manager',
  'employer',
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
}

export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}
