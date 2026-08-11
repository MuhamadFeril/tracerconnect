import { useEffect, useMemo, useState } from 'react'
import { Briefcase, Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { apiError } from '../lib/api'
import { useJobVacancies, useJobVacancyMutations } from '../hooks/queries'
import { useDebounce } from '../hooks/useDebounce'
import type { JobVacancy } from '../lib/types'
import { EMPLOYMENT_TYPE_LABELS, formatDate } from '../lib/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Table, TBody, Td, Th, THead, TRow } from '../components/ui/Table'
import { Pagination } from '../components/ui/Pagination'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

function initialForm(job?: JobVacancy | null) {
  return {
    title: job?.title ?? '',
    company_name: job?.company_name ?? '',
    description: job?.description ?? '',
    location: job?.location ?? '',
    employment_type: job?.employment_type ?? '',
    application_link: job?.application_link ?? '',
    status: job?.status ?? 'draft',
    posted_at: job?.posted_at ? job.posted_at.slice(0, 10) : '',
  }
}

function JobFormModal({
  open,
  onClose,
  job,
}: {
  open: boolean
  onClose: () => void
  job?: JobVacancy | null
}) {
  const mutations = useJobVacancyMutations()
  const toast = useToast()
  const [form, setForm] = useState(() => initialForm(job))
  const [error, setError] = useState<string | null>(null)
  const isEditing = Boolean(job)
  const isSaving = mutations.create.isPending || mutations.update.isPending

  useEffect(() => {
    if (open) {
      setForm(initialForm(job))
      setError(null)
    }
  }, [open, job])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const payload: Partial<JobVacancy> = {
      ...form,
      description: form.description || null,
      location: form.location || null,
      employment_type: (form.employment_type || null) as JobVacancy['employment_type'],
      application_link: form.application_link || null,
      posted_at: form.posted_at || null,
    }
    try {
      if (job) {
        await mutations.update.mutateAsync({ id: job.id, payload })
        toast('Lowongan berhasil diperbarui')
      } else {
        await mutations.create.mutateAsync(payload)
        toast('Lowongan berhasil dibuat')
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
      title={isEditing ? 'Edit Lowongan' : 'Tambah Lowongan'}
      description={isEditing ? `Mengubah ${job?.title}` : 'Bagikan lowongan kerja untuk alumni'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button type="submit" form="job-form" loading={isSaving}>
            {isEditing ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="job-form" onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Posisi" required>
            <Input required name="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Contoh: Software Engineer" />
          </Field>
          <Field label="Perusahaan" required>
            <Input required name="company_name" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="Nama perusahaan" />
          </Field>
        </div>
        <Field label="Deskripsi">
          <Textarea name="description" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Deskripsi posisi, kualifikasi, dan tanggung jawab…" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipe Pekerjaan">
            <Select name="employment_type" value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)}>
              <option value="">— Pilih —</option>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="internship">Magang</option>
              <option value="contract">Kontrak</option>
              <option value="freelance">Freelance</option>
            </Select>
          </Field>
          <Field label="Lokasi">
            <Input name="location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Kota / daerah kerja" />
          </Field>
          <Field label="Link Pendaftaran" hint="URL ke halaman lamaran">
            <Input name="application_link" value={form.application_link} onChange={(e) => set('application_link', e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Status">
            <Select name="status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Ditutup</option>
            </Select>
          </Field>
          <Field label="Tanggal Diposting">
            <Input type="date" name="posted_at" value={form.posted_at} onChange={(e) => set('posted_at', e.target.value)} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}

export function Jobs() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [status, setStatus] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useJobVacancies({
    search: debouncedSearch || undefined,
    status: status || undefined,
    employment_type: employmentType || undefined,
    page,
  })
  const mutations = useJobVacancyMutations()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<JobVacancy | null>(null)
  const [deleting, setDeleting] = useState<JobVacancy | null>(null)

  const rows = useMemo(() => data?.data ?? [], [data])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lowongan Kerja"
        subtitle="Kelola lowongan yang tersedia untuk alumni"
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Tambah Lowongan
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
              placeholder="Cari posisi atau perusahaan…"
              className="pl-9"
            />
          </div>
          <Select name="status-filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-full sm:w-40">
            <option value="">Semua Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="closed">Ditutup</option>
          </Select>
          <Select name="type-filter" value={employmentType} onChange={(e) => { setEmploymentType(e.target.value); setPage(1) }} className="w-full sm:w-44">
            <option value="">Semua Tipe</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="internship">Magang</option>
            <option value="contract">Kontrak</option>
            <option value="freelance">Freelance</option>
          </Select>
        </div>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat data lowongan" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="Tidak ada lowongan" description="Tambahkan lowongan kerja untuk alumni." />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Posisi</Th>
                <Th>Tipe</Th>
                <Th>Lokasi</Th>
                <Th>Status</Th>
                <Th>Diposting</Th>
                <Th className="text-right">Aksi</Th>
              </THead>
              <TBody>
                {rows.map((j) => (
                  <TRow key={j.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <Briefcase className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-sm truncate font-medium text-slate-900">{j.title}</p>
                          <p className="flex items-center gap-1 text-xs text-slate-400">
                            <Building2 className="size-3" /> {j.company_name}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      {j.employment_type ? (
                        <Badge tone="sky">{EMPLOYMENT_TYPE_LABELS[j.employment_type] ?? j.employment_type}</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>{j.location ?? '—'}</Td>
                    <Td><StatusBadge status={j.status} /></Td>
                    <Td className="text-slate-500">{formatDate(j.posted_at ?? j.created_at)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(j); setFormOpen(true) }}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(j)}
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

      <JobFormModal
        key={editing?.id ?? 'new-job'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        job={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await mutations.remove.mutateAsync(deleting.id)
            toast('Lowongan berhasil dihapus')
            setDeleting(null)
          } catch (err) {
            toast(apiError(err), 'error')
            setDeleting(null)
          }
        }}
        loading={mutations.remove.isPending}
        title="Hapus Lowongan"
        message={
          <>
            Lowongan <span className="font-semibold text-slate-800">{deleting?.title}</span> di{' '}
            {deleting?.company_name} akan dihapus secara permanen.
          </>
        }
      />
    </div>
  )
}
