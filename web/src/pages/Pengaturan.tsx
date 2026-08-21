import { KeyRound, ShieldCheck, UserRound } from 'lucide-react'
import { getUser } from '../lib/auth'
import { useMe } from '../hooks/queries'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PasswordChangeForm } from '../components/auth/PasswordChangeForm'

function SecurityItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-slate-800">{value}</div>
      </div>
    </div>
  )
}

export function Pengaturan() {
  const user = getUser()
  const me = useMe()

  const role = me.data?.roles?.[0] ?? user?.roles?.[0]
  const name = me.data?.name ?? user?.name ?? '—'
  const email = me.data?.email ?? user?.email ?? '—'
  const institution = me.data?.institution?.name ?? user?.institution?.name

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan Akun" subtitle="Kelola keamanan dan preferensi akun Anda" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Account info */}
        <Card>
          <CardHeader
            title="Informasi Akun"
            subtitle="Ringkasan data akun Anda"
            actions={<UserRound className="size-4.5 text-slate-400" />}
          />
          <div className="grid grid-cols-1 gap-5 px-5 py-5 sm:grid-cols-2">
            <SecurityItem icon={UserRound} label="Nama" value={name} />
            <SecurityItem icon={ShieldCheck} label="Email" value={email} />
            <SecurityItem
              icon={ShieldCheck}
              label="Peran"
              value={role ? <Badge tone="indigo">{role}</Badge> : '—'}
            />
            <SecurityItem
              icon={ShieldCheck}
              label="Institusi"
              value={institution ? <Badge tone="slate">{institution}</Badge> : '—'}
            />
          </div>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader
            title="Ubah Password"
            subtitle="Ganti kata sandi akun Anda secara berkala"
            actions={<KeyRound className="size-4.5 text-slate-400" />}
          />
          <PasswordChangeForm email={me.data?.email ?? user?.email} />
        </Card>
      </div>
    </div>
  )
}
