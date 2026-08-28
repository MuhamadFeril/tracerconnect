/**
 * Client-side rate limiter.
 *
 * Tracks the last request timestamp per endpoint key and blocks requests
 * that arrive too quickly.  When the server responds with 429, it parses
 * the Retry-After header (or falls back to 60 s) and locks the endpoint
 * for that duration.
 *
 * Usage:
 *   import { rateLimiter } from './rateLimiter'
 *   if (!rateLimiter.allow('auth/login')) throw new Error('…')
 *
 * The Axios interceptor in api.ts calls `rateLimiter.block(key, seconds)`
 * whenever it receives a 429 response.
 */

interface Entry {
  /** Epoch-ms when the next request is allowed. */
  lockedUntil: number
  /** Epoch-ms of the last successful request (for min-interval checks). */
  lastRequest: number
}

const store = new Map<string, Entry>()

/** Default minimum interval between identical requests (ms). */
const DEFAULT_MIN_INTERVAL = 1000

/** Maximum number of entries to prevent memory leaks from abandoned keys. */
const MAX_ENTRIES = 200

// ── Public API ──────────────────────────────────────────────────────────────

export const rateLimiter = {
  /**
   * Returns `true` if the request is allowed, `false` if it should be
   * blocked (too soon or locked out).
   */
  allow(key: string, minInterval = DEFAULT_MIN_INTERVAL): boolean {
    const now = Date.now()
    const entry = store.get(key)

    if (entry) {
      if (now < entry.lockedUntil) return false
      if (now - entry.lastRequest < minInterval) return false
    }

    return true
  },

  /**
   * Record that a request was just made for the given key.
   */
  record(key: string): void {
    const now = Date.now()
    const existing = store.get(key)

    store.set(key, {
      lockedUntil: existing?.lockedUntil ?? 0,
      lastRequest: now,
    })

    // Prevent unbounded growth.
    if (store.size > MAX_ENTRIES) {
      const oldest = store.keys().next().value
      if (oldest) store.delete(oldest)
    }
  },

  /**
   * Lock an endpoint for `seconds` (e.g. after a 429 response).
   */
  block(key: string, seconds: number): void {
    const now = Date.now()
    const existing = store.get(key)

    store.set(key, {
      lockedUntil: now + seconds * 1000,
      lastRequest: existing?.lastRequest ?? now,
    })
  },

  /**
   * Returns the remaining cooldown in seconds for the given key,
   * or 0 if the key is not locked.
   */
  cooldown(key: string): number {
    const entry = store.get(key)
    if (!entry) return 0
    const remaining = Math.ceil((entry.lockedUntil - Date.now()) / 1000)
    return remaining > 0 ? remaining : 0
  },

  /**
   * Remove a key entirely (e.g. after a successful request clears the
   * rate limit).
   */
  clear(key: string): void {
    store.delete(key)
  },

  /**
   * Wipe all entries.
   */
  reset(): void {
    store.clear()
  },
}

// ── Endpoint-specific defaults ───────────────────────────────────────────────

/**
 * Maps URL path prefixes to their rate-limit configuration.
 * Used by the Axios interceptor to pick the right key & interval.
 */
export const ENDPOINT_LIMITS: Record<string, { key: string; minInterval: number }> = {
  '/auth/login':             { key: 'auth/login',             minInterval: 2000 },
  '/auth/register':          { key: 'auth/register',          minInterval: 3000 },
  '/auth/forgot-password':   { key: 'auth/forgot-password',   minInterval: 5000 },
  '/auth/reset-password':    { key: 'auth/reset-password',    minInterval: 3000 },
  '/auth/verify-otp':        { key: 'auth/verify-otp',        minInterval: 2000 },
  '/auth/resend-otp':        { key: 'auth/resend-otp',        minInterval: 10000 },
  '/auth/password/otp':      { key: 'auth/password-otp',      minInterval: 10000 },
  '/conversations':          { key: 'chat.list',              minInterval: 300 },
  '/conversations/':         { key: 'chat.detail',            minInterval: 200 },
}

/**
 * Parse the Retry-After header from a 429 response and return seconds.
 * Falls back to `fallbackSeconds` when the header is missing or invalid.
 */
export function parseRetryAfter(header: string | undefined, fallbackSeconds = 60): number {
  if (!header) return fallbackSeconds
  const n = Number(header)
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : fallbackSeconds
}
