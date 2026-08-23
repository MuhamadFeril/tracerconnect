/**
 * HTML sanitization utilities for user-generated content.
 * Prevents XSS by escaping HTML special characters.
 */

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Sanitize a string for safe display in HTML context.
 * Removes any HTML tags and escapes special characters.
 */
export function sanitizeForDisplay(text: string | null | undefined): string {
  if (!text) return ''
  return escapeHtml(text)
}

/**
 * Sanitize a URL to ensure it's safe for use in href/src attributes.
 * Only allows https: and relative URLs.
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  
  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      // For http:, only allow if it's the same origin
      if (parsed.protocol === 'http:' && parsed.origin !== window.location.origin) {
        return null
      }
      return parsed.toString()
    }
    // Relative URLs
    if (url.startsWith('/')) {
      return url
    }
    return null
  } catch {
    return null
  }
}

/**
 * Sanitize file name for display.
 */
export function sanitizeFileName(name: string): string {
  return escapeHtml(name).slice(0, 255)
}

/**
 * Sanitize user input for form values.
 */
export function sanitizeInput(input: string): string {
  return input.trim().slice(0, 10000)
}