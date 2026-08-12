import { useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationsCount,
} from '../hooks/queries'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews'
import { NotificationRow } from '../components/alumni/NotificationRow'

export function Notifications() {
  const [page, setPage] = useState(1)

  const notifications = useNotifications({ page, per_page: 15 })
  const unread = useUnreadNotificationsCount()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const items = notifications.data?.data ?? []
  const unreadCount = unread.data?.count ?? 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifikasi"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} notifikasi belum dibaca`
            : 'Semua notifikasi sudah dibaca'
        }
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              <CheckCheck className="size-4" /> Tandai semua dibaca
            </Button>
          ) : undefined
        }
      />

      <Card>
        {notifications.isPending ? (
          <LoadingState label="Memuat notifikasi…" />
        ) : notifications.isError ? (
          <ErrorState message="Gagal memuat notifikasi" onRetry={() => notifications.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Belum ada notifikasi"
            description="Notifikasi pengumuman, acara, lowongan, dan lamaran baru akan muncul di sini."
          />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {items.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onOpen={() => markRead.mutate(notification.id)}
                />
              ))}
            </div>
            <Pagination meta={notifications.data?.meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      {unreadCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-700">
          <Bell className="mt-0.5 size-4 shrink-0" />
          <p>
            Notifikasi baru muncul secara otomatis. Notifikasi yang belum dibaca ditandai titik
            indigo di sisi judulnya.
          </p>
        </div>
      )}
    </div>
  )
}
