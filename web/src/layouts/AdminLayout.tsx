import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronUp,
  ClipboardList,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { getUser } from '../lib/auth'
import { avatarUrl, initials } from '../lib/format'
import { useLogout, useNewApplicationsCount, useUnreadConversationsCount, useUnreadNotificationsCount } from '../hooks/queries'
import { Logo } from '../components/ui/Logo'
import { Link } from 'react-router-dom'
import { SetPasswordBanner } from '../components/auth/SetPasswordBanner'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  /** When set, the item is only visible to users holding one of these roles. */
  roles?: string[]
  /** When set, shows the live unread-notification count badge. */
  badge?: boolean
}

const ALUMNI_NAV: NavItem[] = [
  { to: '/home', label: 'Beranda', icon: Home, end: true },
  { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
  { to: '/acara', label: 'Acara', icon: CalendarDays },
  { to: '/lowongan', label: 'Lowongan', icon: Briefcase },
  { to: '/kuisioner', label: 'Kuisioner', icon: ClipboardList },
  { to: '/applications', label: 'Lamaran', icon: FileText },
  { to: '/jejaring', label: 'Jejaring', icon: Users, end: false },
]

const NAV: NavItem[] = [
  // Employer role is intentionally excluded from every data-management menu
  // (alumni, surveys, analytics, …): employers only manage their own
  // vacancies and applicants, never the school's alumni data.
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ['super_admin', 'institution_admin'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, end: false, roles: ['super_admin', 'institution_admin'] },
  { to: '/alumni', label: 'Alumni', icon: Users, end: false, roles: ['super_admin', 'institution_admin'] },
  { to: '/departments', label: 'Jurusan', icon: BookOpen, roles: ['super_admin', 'institution_admin'] },
  { to: '/surveys', label: 'Kuisioner', icon: ClipboardList, roles: ['super_admin', 'institution_admin'] },
  { to: '/reports', label: 'Laporan', icon: FileText, roles: ['super_admin', 'institution_admin'] },
  { to: '/institutions', label: 'Institusi', icon: Building2, roles: ['super_admin'] },
  { to: '/users', label: 'Pengguna', icon: UserCog, roles: ['super_admin', 'institution_admin'] },
  { to: '/roles', label: 'Roles', icon: ShieldCheck, roles: ['super_admin', 'institution_admin'] },
  { to: '/announcements', label: 'Pengumuman', icon: Megaphone, roles: ['super_admin', 'institution_admin'] },
  { to: '/events', label: 'Acara', icon: CalendarDays, roles: ['super_admin', 'institution_admin'] },
  { to: '/jobs', label: 'Lowongan', icon: Briefcase, roles: ['super_admin', 'institution_admin'] },
]

const EMPLOYER_NAV: NavItem[] = [
  { to: '/employer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/employer/lowongan', label: 'Lowongan Saya', icon: Briefcase, end: false },
  { to: '/employer/lamaran', label: 'Lamaran', icon: FileText, badge: true },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = getUser()
  // Alumni see the alumni portal (home, news, events, jobs, profile) instead
  // of the admin navigation.
  const alumniOnly = Boolean(user?.roles?.length) && user!.roles.every((role) => role === 'alumni')
  const employerOnly = Boolean(user?.roles?.length) && user!.roles.every((role) => role === 'employer')
  const items = alumniOnly
    ? ALUMNI_NAV
    : employerOnly
      ? EMPLOYER_NAV
      : NAV.filter((item) => !item.roles || user?.roles?.some((role) => item.roles!.includes(role)))

  const unreadCount = useUnreadNotificationsCount().data?.count ?? 0
  const newAppsCount = useNewApplicationsCount().data?.count ?? 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo className="size-10" />
        <div>
          <p className="text-[15px] font-bold tracking-tight text-white">TracerConnect</p>
          <p className="text-[11px] text-slate-400">{employerOnly ? 'Portal Employer' : 'Admin Panel'}</p>
        </div>
      </div>
      <nav className="mt-2 flex-1 space-y-1 px-3">
        {items.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600/15 text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Icon className="size-4.5" />
            {label}
            {badge && (() => {
              // Employer "Lamaran" badge shows new application count;
              // other badges show the notification count.
              const count = to === '/employer/lamaran' ? newAppsCount : unreadCount
              if (count <= 0) return null
              return (
                <span
                  className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] leading-tight font-bold text-white"
                  aria-label={`${count} belum dibaca`}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )
            })()}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <UserBox />
      </div>
    </div>
  )
}

function Avatar({ user, size = 'size-8', text = 'text-xs' }: { user?: { name?: string; avatar_url?: string | null } | null; size?: string; text?: string }) {
  const src = avatarUrl(user?.avatar_url)
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={clsx('shrink-0 rounded-full object-cover ring-1 ring-white/20', size)}
      />
    )
  }
  return (
    <div className={clsx('flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 font-bold text-white', size, text)}>
      {initials(user?.name)}
    </div>
  )
}

/**
 * Avatar + name that opens a dropdown menu (Profil, Logout).
 * Used at the bottom of the sidebar and in the mobile topbar.
 */
function UserDropdown({ align = 'left', variant = 'sidebar' }: { align?: 'left' | 'right'; variant?: 'sidebar' | 'topbar' }) {
  const user = getUser()
  const logout = useLogout()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu pengguna"
        className={clsx(
          'flex w-full items-center gap-3 rounded-lg transition-colors',
          variant === 'sidebar' ? 'px-2 py-2 hover:bg-white/5' : 'p-1.5 hover:bg-slate-100',
        )}
      >
        <Avatar user={user} size={variant === 'sidebar' ? 'size-8' : 'size-9'} />
        <span className={clsx('min-w-0 flex-1 text-left', variant === 'topbar' && 'hidden sm:block')}>
          <span className={clsx('block truncate font-medium', variant === 'sidebar' ? 'text-xs text-white' : 'text-[13px] text-slate-800')}>
            {user?.name ?? '—'}
          </span>
          <span className={clsx('block truncate text-[11px]', variant === 'sidebar' ? 'text-slate-400' : 'text-slate-400')}>
            {user?.roles?.[0] ?? ''}
          </span>
        </span>
        <ChevronUp
          className={clsx(
            'size-4 shrink-0 transition-transform duration-200',
            variant === 'sidebar' ? 'text-slate-400' : 'text-slate-400',
            variant === 'topbar' && 'hidden sm:block',
            open ? 'rotate-180' : '',
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className={clsx(
            'absolute z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl',
            variant === 'sidebar' ? 'bottom-full left-0 mb-2' : 'top-full mt-1.5',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{user?.name ?? '—'}</p>
            <p className="truncate text-xs text-slate-400">{user?.email ?? ''}</p>
          </div>
          <div className="py-1">
            <Link to="/profile" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <UserRound className="size-4 text-slate-400" />
              Profil
            </Link>
          </div>
          <div className="border-t border-slate-100 pt-1">
            <button
              role="menuitem"
              onClick={() => logout.mutate()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
            >
              <LogOut className="size-4" />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function UserBox() {
  return <UserDropdown variant="sidebar" />
}

export function AdminLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-slate-900 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Tutup menu"
            >
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden text-[15px] text-slate-500 lg:block">
            Selamat datang di <span className="font-medium text-slate-700">TracerConnect</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
            <ChatBell />
            <NotificationBell />
            <MobileUser />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <SetPasswordBanner />
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function ChatBell() {
  const unreadCount = useUnreadConversationsCount().data?.count ?? 0

  return (
    <Link
      to="/chat"
      aria-label={unreadCount > 0 ? `Pesan, ${unreadCount} belum dibaca` : 'Pesan'}
      title="Pesan"
      className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
    >
      <MessageCircle className="size-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 py-0.5 text-[10px] leading-none font-bold text-white ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}

function NotificationBell() {
  const user = getUser()
  const unreadCount = useUnreadNotificationsCount().data?.count ?? 0
  const alumniOnly = Boolean(user?.roles?.length) && user!.roles.every((role) => role === 'alumni')
  const to = alumniOnly ? '/notifikasi' : '/notifications'

  return (
    <Link
      to={to}
      aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
      title="Notifikasi"
      className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
    >
      <Bell className="size-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 py-0.5 text-[10px] leading-none font-bold text-white ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}

function MobileUser() {
  return <UserDropdown variant="topbar" align="right" />
}
