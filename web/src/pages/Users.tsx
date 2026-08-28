import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { apiError } from '../lib/api'
import { getUser } from '../lib/auth'
import { useCreateUser, useDeleteUser, useInstitutions, useRoles, useUpdateUser, useUsers } from '../hooks/queries'
import { useDebounce } from '../hooks/useDebounce'
import type { User } from '../lib/types'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Table, TBody, Td, Th, THead, TRow } from '../components/ui/Table'
import { Pagination } from '../components/ui/Pagination'
import { Badge, type BadgeTone } from '../components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'
import { formatDate } from '../lib/format'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  institution_admin: 'Admin Institusi',
  alumni: 'Alumni',
  employer: 'Employer',
}

const ROLE_TONES: Record<string, BadgeTone> = {
  super_admin: 'violet',
  institution_admin: 'indigo',
  alumni: 'green',
  employer: 'amber',
}

// Roles a platform admin may assign; institution admins get the subset below.
const ALL_ROLES = ['super_admin', 'institution_admin', 'alumni', 'employer']
const INSTITUTION_ADMIN_ROLES = ['alumni', 'employer']

function RoleBadge({ role }: { role: string }) {
  return <Badge tone={ROLE_TONES[role] ?? 'slate'}>{ROLE_LABELS[role] ?? role}</Badge>
}

function initialForm(user?: User | null) {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.roles?.[0] ?? 'employer',
    institution_id: user?.institution_id ?? '',
    password: '',
    password_confirmation: '',
    is_active: user?.is_active ?? true,
  }
}

function UserFormModal({
  open,
  onClose,
  user,
}: {
  open: boolean
  onClose: () => void
  user?: User | null
}) {
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const toast = useToast()
  const currentUser = getUser()

  const isSuperAdmin = currentUser?.roles?.includes('super_admin') ?? false
  const availableRoles = isSuperAdmin ? ALL_ROLES : INSTITUTION_ADMIN_ROLES

  const [form, setForm] = useState(() => initialForm(user))
  const [error, setError] = useState<string | null>(null)
  const isEditing = Boolean(user)
  const isSaving = createUser.isPending || updateUser.isPending
  const showInstitutionField = !isEditing && isSuperAdmin && form.role !== 'super_admin' && form.role !== 'employer'

  // The institutions endpoint is super-admin only; institution admins never
  // render the field, so avoid firing a doomed request for them.
  const { data: institutionsData } = useInstitutions({ per_page: 100 }, { enabled: showInstitutionField })

  useEffect(() => {
    if (open) {
      setForm(initialForm(user))
      setError(null)
    }
  }, [open, user])

  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (form.password !== form.password_confirmation) {
      setError('Konfirmasi password tidak cocok')
      return
    }

    try {
      if (user) {
        const payload: Record<string, unknown> = { name: form.name, email: form.email }
        if (form.password) {
          payload.password = form.password
          payload.password_confirmation = form.password_confirmation
        }
        if (form.role !== user.roles?.[0]) {
          payload.role = form.role
        }
        if (form.is_active !== user.is_active) {
          payload.is_active = form.is_active
        }
        await updateUser.mutateAsync({ id: user.id, payload })
        toast('Pengguna berhasil diperbarui')
      } else {
        await createUser.mutateAsync({
          name: form.name,
          email: form.email,
          password: form.password,
          password_confirmation: form.password_confirmation,
          role: form.role,
          institution_id: isSuperAdmin && form.role !== 'super_admin' ? form.institution_id || null : null,
        })
        toast('Pengguna berhasil ditambahkan')
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
      title={isEditing ? 'Edit Pengguna' : 'Tambah Pengguna'}
      description={isEditing ? `Mengubah data ${user?.name}` : 'Buat akun pengguna baru untuk platform'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button type="submit" form="user-form" loading={isSaving}>
            {isEditing ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nama Lengkap" required>
            <Input required name="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nama pengguna" />
          </Field>
          <Field label="Email" required>
            <Input type="email" required name="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="nama@example.com" />
          </Field>
          <Field label="Role" required>
            <Select name="role" value={form.role} onChange={(e) => set('role', e.target.value)}>
              {availableRoles.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role] ?? role}</option>
              ))}
            </Select>
          </Field>
          {showInstitutionField && (
            <Field label="Institusi" required hint="Wajib diisi untuk role non-super admin">
              <Select
                required
                name="institution_id"
                value={form.institution_id}
                onChange={(e) => set('institution_id', e.target.value)}
              >
                <option value="">— Pilih Institusi —</option>
                {institutionsData?.data.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field
            label={isEditing ? 'Password Baru' : 'Password'}
            required={!isEditing}
            hint={isEditing ? 'Kosongkan jika tidak ingin mengubah password' : 'Minimal 8 karakter'}
          >
            <Input
              type="password"
              required={!isEditing}
              minLength={8}
              name="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Konfirmasi Password" required={!isEditing}>
            <Input
              type="password"
              required={!isEditing}
              name="password_confirmation"
              value={form.password_confirmation}
              onChange={(e) => set('password_confirmation', e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
          {isEditing && (
            <label className="flex items-center gap-2.5 text-sm text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Akun aktif
              <span className="text-xs text-slate-400">— nonaktifkan untuk langsung mencabut semua sesi login</span>
            </label>
          )}
        </div>
        {!isEditing && isSuperAdmin && form.role === 'super_admin' && (
          <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
            Akun super admin bersifat platform-wide dan tidak terikat pada institusi tertentu.
          </p>
        )}
      </form>
    </Modal>
  )
}

export function Users() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useUsers({
    search: debouncedSearch || undefined,
    role: role || undefined,
    page,
  })
  const { data: rolesData } = useRoles()
  const deleteUser = useDeleteUser()
  const toast = useToast()
  const currentUser = getUser()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)

  const rows = useMemo(() => data?.data ?? [], [data])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengguna"
        subtitle="Kelola akun pengguna dan hak aksesnya"
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Tambah Pengguna
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
              placeholder="Cari nama atau email…"
              className="pl-9"
            />
          </div>
          <Select name="role-filter" value={role} onChange={(e) => { setRole(e.target.value); setPage(1) }} className="w-full sm:w-52">
            <option value="">Semua Role</option>
            {rolesData?.map((r) => (
              <option key={r.id} value={r.name}>{ROLE_LABELS[r.name] ?? r.name}</option>
            ))}
          </Select>
        </div>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat data pengguna" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Tidak ada pengguna"
            description="Coba ubah kata kunci pencarian atau tambahkan pengguna baru."
          />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Nama</Th>
                <Th>Institusi</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Dibuat</Th>
                <Th className="text-right">Aksi</Th>
              </THead>
              <TBody>
                {rows.map((u) => {
                  const isSelf = u.id === currentUser?.id
                  return (
                    <TRow key={u.id}>
                      <Td>
                        <p className="font-medium text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </Td>
                      <Td>{u.institution?.name ?? <span className="text-slate-400">—</span>}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => <RoleBadge key={r} role={r} />)}
                        </div>
                      </Td>
                      <Td>
                        {u.is_active
                          ? <Badge tone="green">Aktif</Badge>
                          : <Badge tone="rose">Nonaktif</Badge>}
                      </Td>
                      <Td className="text-slate-500">{formatDate(u.created_at)}</Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditing(u); setFormOpen(true) }}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => setDeleting(u)}
                              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                              title="Hapus"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </Td>
                    </TRow>
                  )
                })}
              </TBody>
            </Table>
            <Pagination meta={data?.meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      <UserFormModal
        key={editing?.id ?? 'new-user'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        user={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteUser.mutateAsync(deleting.id)
            toast('Pengguna berhasil dihapus')
            setDeleting(null)
          } catch (err) {
            toast(apiError(err), 'error')
            setDeleting(null)
          }
        }}
        loading={deleteUser.isPending}
        title="Hapus Pengguna"
        message={
          <>
            Akun <span className="font-semibold text-slate-800">{deleting?.name}</span> akan dihapus secara permanen dan
            semua sesi loginnya dicabut. Tindakan ini tidak dapat dibatalkan.
          </>
        }
      />
    </div>
  )
}
