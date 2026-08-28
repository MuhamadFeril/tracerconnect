import axios from 'axios'
import { clearSession, getToken } from './auth'
import { ENDPOINT_LIMITS, parseRetryAfter, rateLimiter } from './rateLimiter'
import type { ApiEnvelope, Paginated } from './types'

// Backend base URL. Defaults to a same-origin relative path (works when the
// web build is served from the same domain as the API). Set
// VITE_API_BASE_URL (e.g. https://traccerconnect.infinityfreeapp.com/api/v1)
// in the web .env when the API lives on a different domain/origin.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
})

/**
 * Resolve the rate-limiter key for a given URL.
 * Falls back to the full path when no prefix match is found.
 */
function resolveLimitKey(url: string): { key: string; minInterval: number } | null {
  // Try longest-prefix match first.
  const sorted = Object.keys(ENDPOINT_LIMITS).sort((a, b) => b.length - a.length)
  for (const prefix of sorted) {
    if (url.startsWith(prefix)) return ENDPOINT_LIMITS[prefix]
  }
  return null
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Client-side rate limiting: block rapid-fire requests.
  const url = config.url ?? ''
  const limit = resolveLimitKey(url)
  if (limit) {
    if (!rateLimiter.allow(limit.key, limit.minInterval)) {
      const remaining = rateLimiter.cooldown(limit.key)
      const msg = remaining > 0
        ? `Terlalu banyak percobaan. Silakan tunggu ${remaining} detik.`
        : 'Terlalu banyak percobaan. Silakan tunggu sebentar.'
      return Promise.reject(new Error(msg))
    }
    rateLimiter.record(limit.key)
  }

  return config
})

api.interceptors.response.use(
  (response) => {
    // Clear cooldown on success for the endpoint.
    const url = response.config.url ?? ''
    const limit = resolveLimitKey(url)
    if (limit) rateLimiter.clear(limit.key)
    return response
  },
  (error) => {
    // 429 Too Many Requests: parse Retry-After and lock the endpoint.
    if (error.response?.status === 429) {
      const url = error.config?.url ?? ''
      const limit = resolveLimitKey(url)
      const retryAfter = parseRetryAfter(error.response.headers?.['retry-after'])
      if (limit) {
        rateLimiter.block(limit.key, retryAfter)
      }
      // Replace the raw 429 error with a user-friendly message.
      error.message = `Terlalu banyak percobaan. Silakan tunggu ${retryAfter} detik lalu coba lagi.`
    }

    if (
      error.response?.status === 401 &&
      window.location.pathname !== '/login' &&
      // Don't hijack the Google OAuth callback: let GoogleCallback show the
      // real error and offer a retry instead of bouncing to /login.
      window.location.pathname !== '/google/callback'
    ) {
      clearSession()
      window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)

/** Unwrap the standard { success, message, data } envelope. */
export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const { data } = await promise
  return data.data
}

/**
 * Unwrap a paginated list: the envelope carries the items in `data` and the
 * pagination metadata in `meta`, so compose them into a { data, meta } shape.
 *
 * Laravel's LengthAwarePaginator serializes as { data: { data: [...], ... }, meta }
 * when placed inside an ApiResponse envelope. This helper handles both:
 *  - Flat array:  { success, data: [...items], meta }
 *  - Paginated:   { success, data: { data: [...items], ... }, meta }
 */
export async function unwrapPage<T>(promise: Promise<{ data: ApiEnvelope<T[]> }>): Promise<Paginated<T>> {
  const { data } = await promise
  // If data.data is an array, items are already flat. If it's an object
  // (Laravel paginator), the actual items live inside data.data.data.
  const raw = data.data as unknown
  const items: T[] = Array.isArray(raw)
    ? raw
    : (raw as Record<string, unknown>)?.data as T[] ?? []
  const meta = (data.meta ?? (raw as Record<string, unknown>)?.meta) as Paginated<T>['meta']
  return { data: items, meta }
}

/**
 * Trigger a browser download from a blob API response.
 * When the server answers with a JSON error (e.g. 403), the blob is parsed
 * and rethrown instead of silently downloading an error file.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await api.get(url, { responseType: 'blob' })
  const blob = response.data as Blob

  if (blob.type.includes('application/json')) {
    const body = JSON.parse(await blob.text()) as { message?: string }
    throw new Error(body.message ?? 'Terjadi kesalahan')
  }

  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(objectUrl)
}

/** Extract a human-readable message from any API error. */
export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { errors?: Record<string, string[]>; message?: string } | undefined
    const errors = data?.errors
    if (errors && Object.keys(errors).length > 0) {
      return Object.values(errors)[0]?.[0] ?? 'Terjadi kesalahan'
    }
    return data?.message ?? 'Terjadi kesalahan'
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Terjadi kesalahan'
}
