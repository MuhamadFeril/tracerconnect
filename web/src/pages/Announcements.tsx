import { useEffect, useMemo, useState } from 'react'
import { Megaphone, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { apiError } from '../lib/api'
import { useAnnouncementMutations, useAnnouncements } from '../hooks/queries'
import { useDebounce } from '../hooks/useDebounce'
import type { Announcement } from '../lib/types'
import { formatDate } from '../lib/format'
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

function initialForm(announcement?: Announcement | null) {
  return {
    title: announcement?.title ?? '',
    body: announcement?.body ?? '',
    status: announcement?.status ?? 'draft',
    published_at: announcement?.published_at ? announcement.published_at.slice(0, 10) : '',
  }
}

function AnnouncementFormModal({
  open,
  onClose,
  announcement,
}: {
  open: boolean
  onClose: () => void
  announcement?: Announcement | null
}) {
  const mutations = useAnnouncementMutations()
  const toast = useToast()
  const [form, setForm] = useState(() => initialForm(announcement))
  const [error, setError] = useState<string | null>(null)
  const isEditing = Boolean(announcement)
  const isSaving = mutations.create.isPending || mutations.update.isPending

  useEffect(() => {
    if (open) {
      setForm(initialForm(announcement))
      setError(null)
    }
  }, [open, announcement])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const payload = { ...form, published_at: form.published_at || null }
    try {
      if (announcement) {
        await mutations.update.mutateAsync({ id: announcement.id, payload })
        toast('Pengumuman berhasil diperbarui')
      } else {
        await mutations.create.mutateAsync(payload)
        toast('Pengumuman berhasil dibuat')
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
      title={isEditing ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
      description={isEditing ? `Mengubah ${announcement?.title}` : 'Kirim informasi baru untuk alumni'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button type="submit" form="announcement-form" loading={isSaving}>
            {isEditing ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="announcement-form" onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
        <Field label="Judul" required>
          <Input required name="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Judul pengumuman" />
        </Field>
        <Field label="Isi Pengumuman" required>
          <Textarea required name="body" rows={5} value={form.body} onChange={(e) => set('body', e.target.value)} placeholder="Tulis isi pengumuman…" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select name="status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Field>
          <Field label="Tanggal Terbit" hint="Kosongkan untuk memakai waktu sekarang">
            <Input type="date" name="published_at" value={form.published_at} onChange={(e) => set('published_at', e.target.value)} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}

export function Announcements() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useAnnouncements({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
  })
  const mutations = useAnnouncementMutations()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deleting, setDeleting] = useState<Announcement | null>(null)

  const rows = useMemo(() => data?.data ?? [], [data])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengumuman"
        subtitle="Kirim informasi terbaru kepada alumni"
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Tambah Pengumuman
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
              placeholder="Cari judul…"
              className="pl-9"
            />
          </div>
          <Select name="status-filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-full sm:w-44">
            <option value="">Semua Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </Select>
        </div>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat data pengumuman" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Tidak ada pengumuman"
            description="Buat pengumuman pertama untuk memberi tahu alumni."
          />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Judul</Th>
                <Th>Status</Th>
                <Th>Tanggal Terbit</Th>
                <Th>Dibuat</Th>
                <Th className="text-right">Aksi</Th>
              </THead>
              <TBody>
                {rows.map((a) => (
                  <TRow key={a.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Megaphone className="size-4" />
                        </div>
                        <p className="max-w-md truncate font-medium text-slate-900">{a.title}</p>
                      </div>
                    </Td>
                    <Td><StatusBadge status={a.status} /></Td>
                    <Td>{formatDate(a.published_at)}</Td>
                    <Td className="text-slate-500">{formatDate(a.created_at)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(a); setFormOpen(true) }}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(a)}
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

      <AnnouncementFormModal
        key={editing?.id ?? 'new-announcement'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        announcement={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await mutations.remove.mutateAsync(deleting.id)
            toast('Pengumuman berhasil dihapus')
            setDeleting(null)
          } catch (err) {
            toast(apiError(err), 'error')
            setDeleting(null)
          }
        }}
        loading={mutations.remove.isPending}
        title="Hapus Pengumuman"
        message={
          <>
            Pengumuman <span className="font-semibold text-slate-800">{deleting?.title}</span> akan dihapus secara permanen.
          </>
        }
      />
    </div>
  )
}
