import { useRef, useState } from 'react'
import {
  Briefcase,
  CalendarDays,
  Camera,
  GraduationCap,
  IdCard,
  ImagePlus,
  KeyRound,
  MapPin,
  Save,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { apiError } from '../lib/api'
import { getUser } from '../lib/auth'
import { avatarUrl, initials } from '../lib/format'
import {
  useDeleteAvatar,
  useMe,
  useUpdatePassword,
  useUpdateProfile,
  useUploadAvatar,
} from '../hooks/queries'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Field, Input } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { Badge, EmploymentBadge } from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'

function ProfileInfo({
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
        <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{value || '—'}</p>
      </div>
    </div>
  )
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 2

export function Profile() {
  const toast = useToast()
  const user = getUser()
  const me = useMe()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const alumni = me.data?.alumni ?? user?.alumni ?? null

  const updateProfile = useUpdateProfile()
  const updatePassword = useUpdatePassword()
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()

  const [profile, setProfile] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [profileError, setProfileError] = useState<string | null>(null)

  const [pass, setPass] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [passError, setPassError] = useState<string | null>(null)

  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const setProfileField = (key: 'name' | 'email', value: string) =>
    setProfile((p) => ({ ...p, [key]: value }))
  const setPassField = (key: keyof typeof pass, value: string) =>
    setPass((p) => ({ ...p, [key]: value }))

  const avatarSrc = pendingFile && preview ? preview : avatarUrl(user?.avatar_url)

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    setAvatarError(null)

    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setAvatarError('Format foto harus jpg, jpeg, png, atau webp')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setAvatarError('Ukuran foto maksimal 2 MB')
      return
    }

    // Revoke any previous preview before creating a new object URL.
    if (preview) URL.revokeObjectURL(preview)

    setPendingFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const cancelPending = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setPendingFile(null)
    setAvatarError(null)
  }

  const confirmUpload = async () => {
    if (!pendingFile) return
    setAvatarError(null)
    try {
      await uploadAvatar.mutateAsync(pendingFile)
      cancelPending()
      toast('Foto profil berhasil diunggah')
    } catch (err) {
      setAvatarError(apiError(err))
    }
  }

  const onRemoveAvatar = async () => {
    if (pendingFile) {
      cancelPending()
      return
    }
    if (!user?.avatar_url) return

    setAvatarError(null)
    try {
      await deleteAvatar.mutateAsync()
      toast('Foto profil berhasil dihapus')
    } catch (err) {
      setAvatarError(apiError(err))
    }
  }

  const onSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    try {
      await updateProfile.mutateAsync(profile)
      toast('Profil berhasil diperbarui')
    } catch (err) {
      setProfileError(apiError(err))
    }
  }

  const onSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassError(null)

    if (pass.password !== pass.password_confirmation) {
      setPassError('Konfirmasi password baru tidak cocok')
      return
    }

    try {
      await updatePassword.mutateAsync(pass)
      setPass({ current_password: '', password: '', password_confirmation: '' })
      toast('Password berhasil diubah')
    } catch (err) {
      setPassError(apiError(err))
    }
  }

  const role = user?.roles?.[0]
  const busy = uploadAvatar.isPending || deleteAvatar.isPending

  return (
    <div className="space-y-6">
      <PageHeader title="Profil" subtitle="Kelola foto profil, data diri, dan keamanan akun Anda" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Avatar */}
        <Card>
          <CardHeader
            title="Foto Profil"
            subtitle="Format jpg, jpeg, png, atau webp — maksimal 2 MB"
            actions={<Camera className="size-4.5 text-slate-400" />}
          />
          <div className="flex flex-col items-center px-5 py-6">
            <div className="relative">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Foto profil"
                  className="size-28 rounded-full border-4 border-white object-cover shadow-lg ring-2 ring-indigo-100"
                />
              ) : (
                <div className="flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 text-3xl font-bold text-white shadow-lg ring-2 ring-indigo-100">
                  {initials(profile.name)}
                </div>
              )}
              {pendingFile && (
                <button
                  onClick={cancelPending}
                  title="Batal"
                  className="absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full bg-slate-800 text-white shadow-md transition-colors hover:bg-slate-700"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-900">{profile.name || '—'}</p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
              {role && <Badge tone="indigo">{role}</Badge>}
              {user?.institution?.name && <Badge tone="slate">{user.institution.name}</Badge>}
            </div>

            {avatarError && (
              <div className="mt-4 w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {avatarError}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="hidden"
              onChange={onPickFile}
            />

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {pendingFile ? (
                <Button onClick={confirmUpload} loading={busy}>
                  <ImagePlus className="size-4" /> Unggah Foto
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                  <Camera className="size-4" /> {user?.avatar_url ? 'Ganti Foto' : 'Unggah Foto'}
                </Button>
              )}
              {(user?.avatar_url || pendingFile) && (
                <Button variant="ghost" onClick={onRemoveAvatar} loading={busy} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                  <Trash2 className="size-4" /> Hapus
                </Button>
              )}
            </div>
            {!pendingFile && !user?.avatar_url && (
              <p className="mt-3 text-xs text-slate-400">Belum ada foto — gunakan foto agar profil lebih mudah dikenali.</p>
            )}
          </div>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader
            title="Data Diri"
            subtitle="Nama dan email yang tampil di platform"
            actions={<UserRound className="size-4.5 text-slate-400" />}
          />
          <form id="profile-form" onSubmit={onSubmitProfile} className="space-y-4 px-5 py-4">
            {profileError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {profileError}
              </div>
            )}

            <Field label="Nama Lengkap" required>
              <Input required name="name" value={profile.name} onChange={(e) => setProfileField('name', e.target.value)} placeholder="Nama Anda" />
            </Field>
            <Field label="Email" required>
              <Input type="email" required name="email" value={profile.email} onChange={(e) => setProfileField('email', e.target.value)} placeholder="nama@example.com" />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" form="profile-form" loading={updateProfile.isPending}>
                <Save className="size-4" /> Simpan Perubahan
              </Button>
            </div>
          </form>
        </Card>

        {/* Alumni info (read-only, linked by email during registration) */}
        {alumni && (
          <Card className="lg:col-span-2">
            <CardHeader
              title="Informasi Alumni"
              subtitle="Data alumni yang terhubung dengan akun Anda"
              actions={<GraduationCap className="size-4.5 text-slate-400" />}
            />
            <div className="grid grid-cols-1 gap-5 px-5 py-5 sm:grid-cols-2 lg:grid-cols-3">
              <ProfileInfo icon={MapPin} label="Tempat Lahir" value={alumni.birthplace_label} />
              <ProfileInfo icon={IdCard} label="NIS/NIM" value={alumni.nis_nim} />
              <ProfileInfo icon={GraduationCap} label="Jurusan" value={alumni.department} />
              <ProfileInfo
                icon={CalendarDays}
                label="Tahun Lulus"
                value={alumni.graduation_year ? String(alumni.graduation_year) : null}
              />
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Briefcase className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">Status Kerja</p>
                  <div className="mt-1">
                    <EmploymentBadge status={alumni.employment_status} />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Password */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Ubah Password"
            subtitle="Ganti kata sandi akun Anda secara berkala"
            actions={<KeyRound className="size-4.5 text-slate-400" />}
          />
          <form id="password-form" onSubmit={onSubmitPassword} className="space-y-4 px-5 py-4">
            {passError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {passError}
              </div>
            )}

            {/* Hidden username field so password managers can associate the form. */}
            <input type="text" name="username" value={profile.email} autoComplete="username" hidden readOnly />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Password Saat Ini" required>
                <Input
                  type="password"
                  required
                  name="current_password"
                  value={pass.current_password}
                  onChange={(e) => setPassField('current_password', e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </Field>
              <Field label="Password Baru" required hint="Minimal 8 karakter">
                <Input
                  type="password"
                  required
                  minLength={8}
                  name="password"
                  value={pass.password}
                  onChange={(e) => setPassField('password', e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Konfirmasi Password Baru" required>
                <Input
                  type="password"
                  required
                  name="password_confirmation"
                  value={pass.password_confirmation}
                  onChange={(e) => setPassField('password_confirmation', e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
            </div>

            <div className="flex justify-end">
              <Button type="submit" form="password-form" loading={updatePassword.isPending}>
                <KeyRound className="size-4" /> Ubah Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
