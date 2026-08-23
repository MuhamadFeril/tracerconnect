export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const EMPLOYMENT_LABELS: Record<string, string> = {
  working: 'Bekerja',
  unemployed: 'Belum Bekerja',
  entrepreneur: 'Wirausaha',
  continuing_study: 'Melanjutkan Studi',
}

export function employmentLabel(status: string | null): string {
  if (!status) return '—'
  return EMPLOYMENT_LABELS[status] ?? status
}

export const GENDER_LABELS: Record<string, string> = {
  male: 'Laki-laki',
  female: 'Perempuan',
}

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: 'Teks',
  textarea: 'Paragraf',
  number: 'Angka',
  date: 'Tanggal',
  single_choice: 'Pilihan Tunggal',
  multiple_choice: 'Pilihan Ganda',
  dropdown: 'Dropdown',
  rating: 'Rating',
  scale: 'Skala',
  yes_no: 'Ya / Tidak',
  file: 'File',
}

export const RESPONSE_STATUS_LABELS: Record<string, string> = {
  in_progress: 'Draft',
  submitted: 'Selesai',
  expired: 'Kedaluwarsa',
}

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  internship: 'Magang',
  contract: 'Kontrak',
  freelance: 'Freelance',
}

export function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.map(String).join(', ')
  return String(value)
}

/**
 * Resolve an avatar/media URL returned by the API. Absolute URLs are used
 * as-is; relative ones (e.g. /storage/...) are resolved against the current
 * origin so the Vite dev proxy can serve them.
 * Validates URLs to prevent open redirects.
 */
export function avatarUrl(url: string | null | undefined): string | null {
  if (!url) return null
  
  // Allow absolute HTTPS URLs (from trusted CDN/storage)
  if (/^https:\/\//i.test(url)) {
    try {
      const parsed = new URL(url)
      // Only allow HTTPS protocol
      if (parsed.protocol !== 'https:') return null
      return url
    } catch {
      return null
    }
  }
  
  // Relative URLs - resolve against current origin
  if (url.startsWith('/')) {
    return `${window.location.origin}${url}`
  }
  
  // Block any other URL formats (javascript:, data:, etc.)
  return null
}

/** Initials (max 2 chars) used as the avatar fallback. */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('')
}
