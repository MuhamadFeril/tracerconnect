import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, MapPin, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { apiError } from '../lib/api'
import { useEventMutations, useEventParticipants, useEvents, useMarkAttended } from '../hooks/queries'
import { useDebounce } from '../hooks/useDebounce'
import type { EventItem, EventParticipant } from '../lib/types'
import { formatDateTime } from '../lib/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Table, TBody, Td, Th, THead, TRow } from '../components/ui/Table'
import { Pagination } from '../components/ui/Pagination'
import { StatusBadge } from '../components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

function toDatetimeLocal(value: string | null): string {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 16)
}

function initialForm(event?: EventItem | null) {
  return {
    title: event?.title ?? '',
    description: event?.description ?? '',
    location: event?.location ?? '',
    starts_at: toDatetimeLocal(event?.starts_at ?? null),
    ends_at: toDatetimeLocal(event?.ends_at ?? null),
    status: event?.status ?? 'draft',
  }
}

function EventFormModal({
  open,
  onClose,
  event,
}: {
  open: boolean
  onClose: () => void
  event?: EventItem | null
}) {
  const mutations = useEventMutations()
  const toast = useToast()
  const [form, setForm] = useState(() => initialForm(event))
  const [error, setError] = useState<string | null>(null)
  const isEditing = Boolean(event)
  const isSaving = mutations.create.isPending || mutations.update.isPending

  useEffect(() => {
    if (open) {
      setForm(initialForm(event))
      setError(null)
    }
  }, [open, event])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const payload = {
      ...form,
      description: form.description || null,
      location: form.location || null,
      ends_at: form.ends_at || null,
    }
    try {
      if (event) {
        await mutations.update.mutateAsync({ id: event.id, payload })
        toast('Acara berhasil diperbarui')
      } else {
        await mutations.create.mutateAsync(payload)
        toast('Acara berhasil dibuat')
      }
      onClose()
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Acara' : 'Tambah Acara'}
      description={isEditing ? `Mengubah ${event?.title}` : 'Buat acara baru untuk alumni'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button type="submit" form="event-form" loading={isSaving}>
            {isEditing ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="event-form" onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
        <Field label="Nama Acara" required>
          <Input required name="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Contoh: Career Day 2026" />
        </Field>
        <Field label="Deskripsi">
          <Textarea name="description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Deskripsi acara…" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Lokasi">
            <Input name="location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Contoh: Aula Utama" />
          </Field>
          <Field label="Status">
            <Select name="status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Field>
          <Field label="Mulai" required>
            <Input type="datetime-local" required name="starts_at" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
          </Field>
          <Field label="Selesai">
            <Input type="datetime-local" name="ends_at" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}

function ParticipantsModal({
  event,
  onClose,
}: {
  event: EventItem | null
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const { data, isPending, isError, refetch } = useEventParticipants(event?.id ?? '', { page, per_page: 50 })
  const participants = data?.data ?? []

  return (
    <Modal
      open={Boolean(event)}
      onClose={onClose}
      title="Daftar Peserta"
      description={event ? `Peserta acara ${event.title}` : undefined}
      size="lg"
    >
      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Gagal memuat peserta" onRetry={() => refetch()} />
      ) : participants.length === 0 ? (
        <EmptyState title="Belum ada peserta" description="Belum ada alumni yang mendaftar acara ini." />
      ) : (
        <>
          <div className="divide-y divide-slate-100">
            {participants.map((participant) => (
              <ParticipantRow key={participant.id} eventId={event!.id} participant={participant} />
            ))}
          </div>
          <Pagination meta={data?.meta} onPageChange={setPage} />
        </>
      )}
    </Modal>
  )
}

function ParticipantRow({ eventId, participant }: { eventId: string; participant: EventParticipant }) {
  const toast = useToast()
  const markAttended = useMarkAttended(eventId, participant.id)

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">
          {participant.alumni?.name ?? participant.user?.name ?? '—'}
        </p>
        {participant.alumni?.department && (
          <p className="text-xs text-slate-400">
            {participant.alumni.department}
            {participant.alumni.graduation_year ? ` · ${participant.alumni.graduation_year}` : ''}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant={participant.attended ? 'secondary' : 'primary'}
        onClick={async () => {
          try {
            await markAttended.mutateAsync(!participant.attended)
            toast(participant.attended ? 'Kehadiran dibatalkan' : 'Peserta ditandai hadir')
          } catch (err) {
            toast(apiError(err), 'error')
          }
        }}
        loading={markAttended.isPending}
      >
        {participant.attended ? 'Hadir' : 'Tandai Hadir'}
      </Button>
    </div>
  )
}

export function Events() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [status, setStatus] = useState('')
  const [upcoming, setUpcoming] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useEvents({
    search: debouncedSearch || undefined,
    status: status || undefined,
    upcoming: upcoming || undefined,
    page,
  })
  const mutations = useEventMutations()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EventItem | null>(null)
  const [deleting, setDeleting] = useState<EventItem | null>(null)
  const [viewingParticipants, setViewingParticipants] = useState<EventItem | null>(null)

  const rows = useMemo(() => data?.data ?? [], [data])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Acara"
        subtitle="Kelola agenda kegiatan alumni"
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Tambah Acara
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari acara atau lokasi…"
              className="pl-9"
            />
          </div>
          <Select name="status-filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-full sm:w-44">
            <option value="">Semua Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </Select>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={upcoming}
              onChange={(e) => {
                setUpcoming(e.target.checked)
                setPage(1)
              }}
              className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Hanya acara mendatang
          </label>
        </div>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat data acara" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="Tidak ada acara" description="Buat acara pertama untuk alumni." />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Acara</Th>
                <Th>Mulai</Th>
                <Th>Lokasi</Th>
                <Th>Status</Th>
                <Th>Peserta</Th>
                <Th className="text-right">Aksi</Th>
              </THead>
              <TBody>
                {rows.map((ev) => (
                  <TRow key={ev.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                          <CalendarDays className="size-4" />
                        </div>
                        <p className="max-w-md truncate font-medium text-slate-900">{ev.title}</p>
                      </div>
                    </Td>
                    <Td className="text-slate-600">{formatDateTime(ev.starts_at)}</Td>
                    <Td>
                      {ev.location ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <MapPin className="size-3.5 text-slate-400" /> {ev.location}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td><StatusBadge status={ev.status} /></Td>
                    <Td>
                      <button
                        onClick={() => setViewingParticipants(ev)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
                        title="Lihat peserta"
                      >
                        <Users className="size-3.5" />
                        {ev.participants_count ?? 0}
                      </button>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(ev); setFormOpen(true) }}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(ev)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </Td>
                  </TRow>
                ))}
              </TBody>
            </Table>
            <Pagination meta={data?.meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      <EventFormModal
        key={editing?.id ?? 'new-event'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        event={editing}
      />

      <ParticipantsModal event={viewingParticipants} onClose={() => setViewingParticipants(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await mutations.remove.mutateAsync(deleting.id)
            toast('Acara berhasil dihapus')
            setDeleting(null)
          } catch (err) {
            toast(apiError(err), 'error')
            setDeleting(null)
          }
        }}
        loading={mutations.remove.isPending}
        title="Hapus Acara"
        message={
          <>
            Acara <span className="font-semibold text-slate-800">{deleting?.title}</span> akan dihapus secara permanen.
          </>
        }
      />
    </div>
  )
}
