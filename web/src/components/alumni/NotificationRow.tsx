import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Bell, Briefcase, CalendarDays, ClipboardList, Link2, MessageSquare, Megaphone } from 'lucide-react'
import { formatDateTime } from '../../lib/format'
import type { NotificationItem } from '../../lib/types'

const NOTIFICATION_KINDS: Record<string, { icon: typeof Bell; tone: string }> = {
  announcement: { icon: Megaphone, tone: 'bg-indigo-50 text-indigo-600' },
  event: { icon: CalendarDays, tone: 'bg-sky-50 text-sky-600' },
  job: { icon: Briefcase, tone: 'bg-violet-50 text-violet-600' },
  survey: { icon: ClipboardList, tone: 'bg-emerald-50 text-emerald-600' },
  connection: { icon: Link2, tone: 'bg-amber-50 text-amber-600' },
  chat: { icon: MessageSquare, tone: 'bg-cyan-50 text-cyan-600' },
  info: { icon: Bell, tone: 'bg-slate-100 text-slate-600' },
}

/**
 * One notification row used by the home panel and the dedicated
 * notifications page. Clicking marks it read (via onOpen) and follows the
 * notification's URL when one is set.
 */
export function NotificationRow({
  notification,
  onOpen,
}: {
  notification: NotificationItem
  onOpen: () => void
}) {
  const kind = NOTIFICATION_KINDS[notification.kind] ?? NOTIFICATION_KINDS.info
  const Icon = kind.icon
  const unread = notification.read_at === null

  const inner = (
    <>
      <div className={clsx('flex size-9 shrink-0 items-center justify-center rounded-lg', kind.tone)}>
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="truncate">{notification.title}</span>
          {unread && <span className="size-2 shrink-0 rounded-full bg-indigo-500" aria-label="Belum dibaca" />}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{notification.body}</p>
        <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(notification.created_at)}</p>
      </div>
    </>
  )

  const className = 'flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50'

  if (notification.url) {
    return (
      <Link to={notification.url} onClick={onOpen} className={className}>
        {inner}
      </Link>
    )
  }

  return (
    <button onClick={onOpen} className={clsx(className, 'w-full text-left')}>
      {inner}
    </button>
  )
}
