import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { apiError } from '../lib/api'
import { useCreateInstitution, useDeleteInstitution, useInstitutions, useUpdateInstitution } from '../hooks/queries'
import { useDebounce } from '../hooks/useDebounce'
import type { Institution, InstitutionStatus } from '../lib/types'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Table, TBody, Td, Th, THead, TRow } from '../components/ui/Table'
import { Pagination } from '../components/ui/Pagination'
import { Badge } from '../components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'
import { formatDate } from '../lib/format'

const STATUS_LABELS: Record<InstitutionStatus, string> = {
  active: 'Aktif',
  trial: 'Trial',
  suspended: 'Ditangguhkan',
}

const STATUS_TONES: Record<InstitutionStatus, 'green' | 'amber' | 'rose'> = {
  active: 'green',
  trial: 'amber',
  suspended: 'rose',
}

function InstitutionBadge({ status }: { status: InstitutionStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function initialForm(institution?: Institution | null) {
  return {
    name: institution?.name ?? '',
    slug: institution?.slug ?? '',
    code: institution?.code ?? '',
    email: institution?.email ?? '',
    phone: institution?.phone ?? '',
    website: institution?.website ?? '',
    address: institution?.address ?? '',
    description: institution?.description ?? '',
    status: institution?.status ?? 'active',
  }
}

function InstitutionFormModal({
  open,
  onClose,
  institution,
}: {
  open: boolean
  onClose: () => void
  institution?: Institution | null
}) {
  const createInstitution = useCreateInstitution()
  const updateInstitution = useUpdateInstitution()
  const toast = useToast()
  const [form, setForm] = useState(() => initialForm(institution))
  const [slugTouched, setSlugTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditing = Boolean(institution)
  const isSaving = createInstitution.isPending || updateInstitution.isPending

  useEffect(() => {
    if (open) {
      setForm(initialForm(institution))
      setSlugTouched(false)
      setError(null)
    }
  }, [open, institution])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const onNameChange = (value: string) => {
    setForm((f) => ({
      ...f,
      name: value,
      // Auto-generate the slug while creating until the user types it manually.
      slug: !isEditing && !slugTouched ? slugify(value) : f.slug,
    }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const payload: Partial<Institution> = {
      name: form.name,
      slug: form.slug,
      code: form.code || null,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      address: form.address || null,
      description: form.description || null,
      status: form.status as InstitutionStatus,
    }
    try {
      if (institution) {
        await updateInstitution.mutateAsync({ id: institution.id, payload })
        toast('Institusi berhasil diperbarui')
      } else {
        await createInstitution.mutateAsync(payload)
        toast('Institusi berhasil ditambahkan')
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
      title={isEditing ? 'Edit Institusi' : 'Tambah Institusi'}
      description={isEditing ? `Mengubah data ${institution?.name}` : 'Daftarkan institusi pendidikan baru'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button type="submit" form="institution-form" loading={isSaving}>
            {isEditing ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="institution-form" onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nama Institusi" required>
            <Input required name="name" value={form.name} onChange={(e) => onNameChange(e.target.value)} placeholder="Contoh: SMK Negeri 1 Bandung" />
          </Field>
          <Field label="Slug" required hint="Digunakan pada URL institusi. Hanya huruf kecil, angka, dan tanda hubung.">
            <Input
              required
              name="slug"
              value={form.slug}
              onChange={(e) => {
                set('slug', slugify(e.target.value))
                setSlugTouched(true)
              }}
              placeholder="smk-negeri-1-bandung"
              className="font-mono"
            />
          </Field>
          <Field label="Kode" hint="Opsional, contoh: SMKN1BDG">
            <Input name="code" value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="Kode singkat institusi" />
          </Field>
          <Field label="Status">
            <Select name="status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Aktif</option>
              <option value="trial">Trial</option>
              <option value="suspended">Ditangguhkan</option>
            </Select>
          </Field>
          <Field label="Email">
            <Input type="email" name="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="kontak@institusi.ac.id" />
          </Field>
          <Field label="Telepon">
            <Input name="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(022) 1234 5678" />
          </Field>
          <Field label="Website">
            <Input name="website" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://institusi.ac.id" />
          </Field>
          <Field label="Alamat">
            <Input name="address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Alamat lengkap institusi" />
          </Field>
          <Field label="Deskripsi" className="sm:col-span-2">
            <Textarea
              name="description"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Profil singkat institusi…"
            />
          </Field>
        </div>
      </form>
    </Modal>
  )
}

export function Institutions() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useInstitutions({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
  })
  const deleteInstitution = useDeleteInstitution()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Institution | null>(null)
  const [deleting, setDeleting] = useState<Institution | null>(null)

  const rows = useMemo(() => data?.data ?? [], [data])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Institusi"
        subtitle="Kelola institusi pendidikan di platform"
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Tambah Institusi
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
              placeholder="Cari nama atau kode…"
              className="pl-9"
            />
          </div>
          <Select name="status-filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-full sm:w-44">
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="trial">Trial</option>
            <option value="suspended">Ditangguhkan</option>
          </Select>
        </div>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat data institusi" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Tidak ada institusi"
            description="Tambahkan institusi pendidikan pertama untuk mulai menggunakan platform."
          />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Institusi</Th>
                <Th>Kontak</Th>
                <Th>Status</Th>
                <Th className="text-center">Pengguna</Th>
                <Th>Dibuat</Th>
                <Th className="text-right">Aksi</Th>
              </THead>
              <TBody>
                {rows.map((i) => (
                  <TRow key={i.id}>
                    <Td>
                      <p className="font-medium text-slate-900">{i.name}</p>
                      <p className="text-xs text-slate-400">/{i.slug}</p>
                    </Td>
                    <Td>
                      <p className="text-slate-600">{i.email ?? '—'}</p>
                      <p className="text-xs text-slate-400">{i.phone ?? '—'}</p>
                    </Td>
                    <Td><InstitutionBadge status={i.status} /></Td>
                    <Td className="text-center font-medium text-slate-900">{i.users_count ?? 0}</Td>
                    <Td className="text-slate-500">{formatDate(i.created_at)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(i); setFormOpen(true) }}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(i)}
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

      <InstitutionFormModal
        key={editing?.id ?? 'new-institution'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        institution={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteInstitution.mutateAsync(deleting.id)
            toast('Institusi berhasil dihapus')
            setDeleting(null)
          } catch (err) {
            toast(apiError(err), 'error')
            setDeleting(null)
          }
        }}
        loading={deleteInstitution.isPending}
        title="Hapus Institusi"
        message={
          <>
            Institusi <span className="font-semibold text-slate-800">{deleting?.name}</span> beserta seluruh data terkait
            akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
          </>
        }
      />
    </div>
  )
}
