import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { apiError } from '../lib/api'
import { useDepartmentMutations, useDepartments } from '../hooks/queries'
import { useDebounce } from '../hooks/useDebounce'
import type { Department } from '../lib/types'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Table, TBody, Td, Th, THead, TRow } from '../components/ui/Table'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

function initialForm(department?: Department | null) {
  return {
    name: department?.name ?? '',
    code: department?.code ?? '',
  }
}

function DepartmentFormModal({
  open,
  onClose,
  department,
}: {
  open: boolean
  onClose: () => void
  department?: Department | null
}) {
  const mutations = useDepartmentMutations()
  const toast = useToast()
  const [form, setForm] = useState(() => initialForm(department))
  const [error, setError] = useState<string | null>(null)
  const isEditing = Boolean(department)
  const isSaving = mutations.create.isPending || mutations.update.isPending

  useEffect(() => {
    if (open) {
      setForm(initialForm(department))
      setError(null)
    }
  }, [open, department])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const payload = { name: form.name.trim(), code: form.code.trim() || null }
    try {
      if (department) {
        await mutations.update.mutateAsync({ id: department.id, payload })
        toast('Jurusan berhasil diperbarui')
      } else {
        await mutations.create.mutateAsync(payload)
        toast('Jurusan berhasil ditambahkan')
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
      title={isEditing ? 'Edit Jurusan' : 'Tambah Jurusan'}
      description={isEditing ? `Mengubah ${department?.name}` : 'Tambahkan jurusan yang dimiliki sekolah Anda'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button type="submit" form="department-form" loading={isSaving}>
            {isEditing ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="department-form" onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
        <Field label="Nama Jurusan" required hint="Nama akan tampil di profil alumni, filter, dan laporan">
          <Input
            required
            name="name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Contoh: Rekayasa Perangkat Lunak"
          />
        </Field>
        <Field label="Kode" hint="Opsional — singkatan jurusan, mis. RPL">
          <Input
            name="code"
            value={form.code}
            onChange={(e) => set('code', e.target.value)}
            placeholder="Contoh: RPL"
          />
        </Field>
      </form>
    </Modal>
  )
}

export function Departments() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)

  const { data, isPending, isError, refetch } = useDepartments({ search: debouncedSearch || undefined })
  const mutations = useDepartmentMutations()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [deleting, setDeleting] = useState<Department | null>(null)

  const rows = useMemo(() => data?.data ?? [], [data])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jurusan"
        subtitle="Kelola jurusan sesuai kebutuhan sekolah Anda"
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Tambah Jurusan
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari jurusan…"
              className="pl-9"
            />
          </div>
        </div>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat data jurusan" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={search ? 'Jurusan tidak ditemukan' : 'Belum ada jurusan'}
            description={
              search
                ? 'Coba kata kunci lain atau kosongkan pencarian.'
                : 'Tambahkan jurusan pertama yang dimiliki sekolah Anda.'
            }
          />
        ) : (
          <Table>
            <THead>
              <Th>Nama Jurusan</Th>
              <Th>Kode</Th>
              <Th className="text-right">Jumlah Alumni</Th>
              <Th className="text-right">Aksi</Th>
            </THead>
            <TBody>
              {rows.map((d) => (
                <TRow key={d.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <BookOpen className="size-4" />
                      </div>
                      <p className="font-medium text-slate-900">{d.name}</p>
                    </div>
                  </Td>
                  <Td>{d.code ? <span className="font-mono text-xs">{d.code}</span> : '—'}</Td>
                  <Td className="text-right">{d.alumni_count ?? 0}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditing(d); setFormOpen(true) }}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(d)}
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
        )}
      </Card>

      <DepartmentFormModal
        key={editing?.id ?? 'new-department'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        department={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await mutations.remove.mutateAsync(deleting.id)
            toast('Jurusan berhasil dihapus')
            setDeleting(null)
          } catch (err) {
            toast(apiError(err), 'error')
            setDeleting(null)
          }
        }}
        loading={mutations.remove.isPending}
        title="Hapus Jurusan"
        message={
          <>
            Jurusan <span className="font-semibold text-slate-800">{deleting?.name}</span> akan dihapus secara permanen.
            {Boolean(deleting?.alumni_count) && (
              <span className="mt-2 block rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
                {deleting?.alumni_count} alumni terdaftar di jurusan ini — mereka akan ditampilkan tanpa jurusan.
              </span>
            )}
          </>
        }
      />
    </div>
  )
}
