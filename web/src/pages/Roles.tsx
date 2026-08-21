import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useRoles } from '../hooks/queries'
import type { Role } from '../lib/types'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Badge, type BadgeTone } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/StateViews'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  institution_admin: 'Admin Institusi',
  alumni: 'Alumni',
  employer: 'Employer',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: 'Mengelola seluruh platform dan institusi.',
  institution_admin: 'Mengelola satu institusi miliknya.',
  alumni: 'Mengelola profil dan mengisi tracer study.',
  employer: 'Mengisi employer survey atau mengelola lowongan jika fitur diaktifkan.',
}

const ROLE_TONES: Record<string, BadgeTone> = {
  super_admin: 'violet',
  institution_admin: 'indigo',
  alumni: 'green',
  employer: 'amber',
}

const MODULE_LABELS: Record<string, string> = {
  institution: 'Institusi',
  user: 'Pengguna',
  role: 'Role',
  alumni: 'Alumni',
  department: 'Jurusan',
  'graduation-year': 'Tahun Lulus',
  survey: 'Survey',
  response: 'Respons',
  analytics: 'Analitik',
  report: 'Laporan',
  company: 'Perusahaan',
  job: 'Lowongan',
  announcement: 'Pengumuman',
  event: 'Acara',
  notification: 'Notifikasi',
  settings: 'Pengaturan',
  audit: 'Audit',
}

const ACTION_LABELS: Record<string, string> = {
  view: 'Melihat',
  create: 'Membuat',
  update: 'Mengubah',
  delete: 'Menghapus',
  import: 'Import',
  export: 'Export',
  publish: 'Mempublikasikan',
  assign: 'Menetapkan',
  generate: 'Menghasilkan',
  send: 'Mengirim',
}

function permissionLabel(name: string): string {
  const action = name.split('.').slice(1).join(' ')
  return ACTION_LABELS[action] ?? action
}

function groupPermissions(permissions: string[]): [string, string[]][] {
  const groups = new Map<string, string[]>()
  for (const name of permissions) {
    const module = name.split('.')[0]
    groups.set(module, [...(groups.get(module) ?? []), name])
  }
  return [...groups.entries()].sort((a, b) =>
    (MODULE_LABELS[a[0]] ?? a[0]).localeCompare(MODULE_LABELS[b[0]] ?? b[0]),
  )
}

function RoleDetailModal({ role, onClose }: { role: Role; onClose: () => void }) {
  const groups = groupPermissions(role.permissions)

  return (
    <Modal
      open
      onClose={onClose}
      title={ROLE_LABELS[role.name] ?? role.name}
      description="Daftar permission yang dimiliki role ini"
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Role ini tidak memiliki permission.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {groups.map(([module, names]) => (
            <div key={module} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {MODULE_LABELS[module] ?? module}
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {names.map((name) => (
                  <li key={name} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="size-1.5 shrink-0 rounded-full bg-indigo-400" />
                    {permissionLabel(name)}
                    <span className="ml-auto font-mono text-[11px] text-slate-400">{name.split('.')[1]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

export function Roles() {
  const { data, isPending, isError, refetch } = useRoles()
  const [selected, setSelected] = useState<Role | null>(null)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Matriks hak akses setiap role di platform"
      />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Gagal memuat data role" onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Tidak ada role" description="Role belum dikonfigurasi." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((role) => (
            <Card
              key={role.id}
              className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <button
                onClick={() => setSelected(role)}
                className="flex h-full w-full flex-col items-start gap-3 p-5 text-left"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                    <ShieldCheck className="size-5" />
                  </div>
                  <Badge tone={ROLE_TONES[role.name] ?? 'slate'}>{ROLE_LABELS[role.name] ?? role.name}</Badge>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{ROLE_LABELS[role.name] ?? role.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {ROLE_DESCRIPTIONS[role.name] ?? 'Role bawaan platform.'}
                  </p>
                </div>
                <p className="mt-auto text-xs font-medium text-indigo-600">
                  {role.permissions.length} permission
                </p>
              </button>
            </Card>
          ))}
        </div>
      )}

      {selected && <RoleDetailModal role={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
