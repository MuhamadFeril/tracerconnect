import { Button } from '../ui/Button'

function GoogleLogo() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
      />
    </svg>
  )
}

/**
 * "Login dengan Google" button using the classic server-side OAuth flow.
 *
 * Clicking navigates the whole browser to the backend's `/auth/google`
 * endpoint, which redirects to Google's account chooser (prompt=select_account)
 * with PKCE. Google bounces back to the backend callback, which resolves the
 * user, issues a Sanctum token, and sends the browser to `/google/callback`
 * where the session is stored.
 *
 * This avoids the GIS popup/One Tap problems entirely: no "Authorized
 * JavaScript origin" is required in Google Cloud Console — only the redirect
 * URI (GOOGLE_REDIRECT_URI) needs to be authorized.
 */
export function GoogleSignInButton({ theme = 'outline' }: { theme?: 'outline' | 'filled_blue' | 'filled_black' | 'white' }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className={theme === 'outline' ? 'w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'w-full'}
      onClick={() => {
        window.location.assign('/api/v1/auth/google')
      }}
    >
      <GoogleLogo /> Login dengan Google
    </Button>
  )
}
