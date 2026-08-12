import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Send,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessagesSquare,
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
import { useLogout, useUnreadNotificationsCount } from '../hooks/queries'
import { Badge } from '../components/ui/Badge'
import { Logo } from '../components/ui/Logo'
import { Link } from 'react-router-dom'

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
  { to: '/lamaran', label: 'Lamaran', icon: Send },
  { to: '/notifikasi', label: 'Notifikasi', icon: Bell, badge: true },
  { to: '/kuisioner', label: 'Kuisioner', icon: ClipboardList },
  { to: '/profile', label: 'Profil', icon: UserRound },
]

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, end: false },
  { to: '/alumni', label: 'Alumni', icon: Users, end: false },
  { to: '/departments', label: 'Jurusan', icon: BookOpen, roles: ['super_admin', 'institution_admin', 'operator'] },
  { to: '/surveys', label: 'Surveys', icon: MessagesSquare, end: false },
  { to: '/responses', label: 'Respons', icon: GraduationCap, end: false },
  { to: '/reports', label: 'Laporan', icon: FileText, roles: ['super_admin', 'institution_admin', 'operator', 'viewer'] },
  { to: '/institutions', label: 'Institusi', icon: Building2, roles: ['super_admin'] },
  { to: '/users', label: 'Pengguna', icon: UserCog, roles: ['super_admin', 'institution_admin'] },
  { to: '/roles', label: 'Roles', icon: ShieldCheck, roles: ['super_admin', 'institution_admin'] },
  { to: '/announcements', label: 'Pengumuman', icon: Megaphone, roles: ['super_admin', 'institution_admin'] },
  { to: '/events', label: 'Acara', icon: CalendarDays, roles: ['super_admin', 'institution_admin'] },
  { to: '/jobs', label: 'Lowongan', icon: Briefcase, roles: ['super_admin', 'institution_admin', 'employer'] },
  { to: '/applications', label: 'Lamaran', icon: Send, roles: ['super_admin', 'institution_admin', 'employer'] },
  { to: '/notifications', label: 'Notifikasi', icon: Bell, badge: true },
  { to: '/profile', label: 'Profil', icon: UserRound },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = getUser()
  // Alumni see the alumni portal (home, news, events, jobs, profile) instead
  // of the admin navigation.
  const alumniOnly = Boolean(user?.roles?.length) && user!.roles.every((role) => role === 'alumni')
  const items = alumniOnly
    ? ALUMNI_NAV
    : NAV.filter((item) => !item.roles || user?.roles?.some((role) => item.roles!.includes(role)))

  const unreadCount = useUnreadNotificationsCount().data?.count ?? 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo className="size-10" />
        <div>
          <p className="text-[15px] font-bold tracking-tight text-white">TracerConnect</p>
          <p className="text-[11px] text-slate-400">Admin Panel</p>
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
            {badge && unreadCount > 0 && (
              <span
                className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] leading-tight font-bold text-white"
                aria-label={`${unreadCount} notifikasi belum dibaca`}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
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

function UserBox() {
  const user = getUser()
  const logout = useLogout()

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2">
      <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-white hover:text-indigo-300">{user?.name ?? '—'}</p>
          <p className="truncate text-[11px] text-slate-400">
            {user?.roles?.[0] ? <Badge tone="indigo" className="mt-0.5">{user.roles[0]}</Badge> : ''}
          </p>
        </div>
      </Link>
      <button
        onClick={() => logout.mutate()}
        title="Keluar"
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  )
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
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <NotificationBell />
            <MobileUser />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
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
  const user = getUser()
  const logout = useLogout()

  return (
    <div className="flex items-center gap-3">
      <Link to="/profile" className="flex items-center gap-3">
        <Avatar user={user} size="size-9" />
        <div className="hidden text-right sm:block">
          <p className="text-[13px] font-medium leading-tight text-slate-800">{user?.name}</p>
          <p className="text-[11px] leading-tight text-slate-400">{user?.roles?.[0] ?? ''}</p>
        </div>
      </Link>
      <button
        onClick={() => logout.mutate()}
        title="Keluar"
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  )
}
