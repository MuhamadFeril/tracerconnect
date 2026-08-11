import axios from 'axios'
import { clearSession, getToken } from './auth'
import type { ApiEnvelope, Paginated } from './types'

export const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
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
 */
export async function unwrapPage<T>(promise: Promise<{ data: ApiEnvelope<T[]> }>): Promise<Paginated<T>> {
  const { data } = await promise
  return { data: data.data, meta: data.meta as Paginated<T>['meta'] }
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
