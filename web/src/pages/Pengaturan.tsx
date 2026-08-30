import { useState } from 'react'
import { KeyRound, ShieldCheck, Trash2, UserRound, AlertTriangle } from 'lucide-react'
import { getUser } from '../lib/auth'
import { useDeleteAccount, useMe } from '../hooks/queries'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { PasswordChangeForm } from '../components/auth/PasswordChangeForm'
import { useToast } from '../components/ui/Toast'

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
  const toast = useToast()
  const user = getUser()
  const me = useMe()
  const deleteAccount = useDeleteAccount()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')

  const role = me.data?.roles?.[0] ?? user?.roles?.[0]
  const name = me.data?.name ?? user?.name ?? '—'
  const email = me.data?.email ?? user?.email ?? '—'
  const institution = me.data?.institution?.name ?? user?.institution?.name

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount.mutateAsync()
      toast('Akun berhasil dihapus')
    } catch {
      toast('Gagal menghapus akun', 'error')
    }
  }

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

      {/* Danger zone — Delete account */}
      <Card className="border-rose-200">
        <CardHeader
          title="Hapus Akun"
          subtitle="Tindakan ini tidak dapat dibatalkan"
          actions={<Trash2 className="size-4.5 text-rose-400" />}
        />
        <div className="px-5 py-5">
          {!showDeleteConfirm ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                <AlertTriangle className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-rose-800">Hapus akun Anda secara permanen</p>
                <p className="mt-0.5 text-xs leading-relaxed text-rose-600">
                  Semua data profil, riwayat, dan sesi aktif Anda akan dihapus. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
               <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="shrink-0 border border-rose-300 text-rose-700 hover:!bg-rose-50 hover:!text-rose-800"
              >
                <Trash2 className="size-4" /> Hapus Akun
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-800">
                  Ketik <span className="font-mono">{email}</span> untuk mengonfirmasi:
                </p>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={email}
                  className="mt-2 w-full rounded-lg border border-rose-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setConfirmEmail('')
                  }}
                  className="border-slate-300"
                >
                  Batal
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteAccount}
                  loading={deleteAccount.isPending}
                  disabled={confirmEmail !== email}
                >
                  <Trash2 className="size-4" /> Ya, Hapus Akun Saya
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
