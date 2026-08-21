import { useEffect, useRef, useState } from 'react'
import {
  AtSign,
  CalendarDays,
  Camera,
  ClipboardList,
  Globe,
  GraduationCap,
  ImagePlus,
  KeyRound,
  LifeBuoy,
  Plus,
  Save,
  Settings,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiError } from '../lib/api'
import { getUser } from '../lib/auth'
import { avatarUrl, initials } from '../lib/format'
import type { SocialLink } from '../lib/types'
import {
  useDeleteAvatar,
  useDistricts,
  useMe,
  useProvinces,
  useRegencies,
  useUpdateProfile,
  useUploadAvatar,
} from '../hooks/queries'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { PasswordChangeForm } from '../components/auth/PasswordChangeForm'
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

const SOCIAL_PLATFORMS = [
  { value: 'facebook', label: 'Facebook', icon: AtSign },
  { value: 'instagram', label: 'Instagram', icon: AtSign },
  { value: 'linkedin', label: 'LinkedIn', icon: Globe },
  { value: 'twitter', label: 'Twitter / X', icon: AtSign },
  { value: 'tiktok', label: 'TikTok', icon: AtSign },
  { value: 'whatsapp', label: 'WhatsApp', icon: AtSign },
  { value: 'website', label: 'Website', icon: Globe },
]

export function Profile() {
  const toast = useToast()
  const user = getUser()
  const me = useMe()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const alumni = me.data?.alumni ?? user?.alumni ?? null
  // Biodata source: the linked alumni summary when one exists; otherwise the
  // freshest user record from /auth/me (admin accounts have no
  // alumni record). Falls back to the stored session while me is loading.
  const biodataSource = alumni ?? me.data ?? user ?? null

  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()

  const [profile, setProfile] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [profileError, setProfileError] = useState<string | null>(null)

  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  // Alumni-editable fields (NIS, NISN, social media, skills). Kept in sync
  // with the freshest alumni data until the user starts editing.
  const [alumniForm, setAlumniForm] = useState({
    nis: '',
    nisn: '',
    socials: [] as SocialLink[],
    skills: [] as string[],
  })
  const [alumniTouched, setAlumniTouched] = useState(false)
  const [alumniError, setAlumniError] = useState<string | null>(null)
  const [newSkill, setNewSkill] = useState('')

  useEffect(() => {
    if (alumniTouched || !alumni) return
    setAlumniForm({
      nis: alumni.nis_nim ?? '',
      nisn: alumni.nisn ?? '',
      socials: alumni.socials ?? [],
      skills: alumni.skills ?? [],
    })
  }, [alumni, alumniTouched])

  const setProfileField = (key: 'name' | 'email', value: string) =>
    setProfile((p) => ({ ...p, [key]: value }))

  const setAlumniField = (key: 'nis' | 'nisn', value: string) => {
    setAlumniTouched(true)
    setAlumniForm((f) => ({ ...f, [key]: value }))
  }

  const setSocial = (index: number, patch: Partial<SocialLink>) => {
    setAlumniTouched(true)
    setAlumniForm((f) => {
      const socials = [...f.socials]
      socials[index] = { ...socials[index], ...patch }
      return { ...f, socials }
    })
  }

  const addSocial = () => {
    setAlumniTouched(true)
    setAlumniForm((f) => ({ ...f, socials: [...f.socials, { platform: 'instagram', url: '' }] }))
  }

  const removeSocial = (index: number) => {
    setAlumniTouched(true)
    setAlumniForm((f) => ({ ...f, socials: f.socials.filter((_, i) => i !== index) }))
  }

  const toggleSkill = (skill: string) => {
    setAlumniTouched(true)
    setAlumniForm((f) => ({
      ...f,
      skills: f.skills.includes(skill)
        ? f.skills.filter((s) => s !== skill)
        : [...f.skills, skill],
    }))
  }

  const addSkill = () => {
    const skill = newSkill.trim()
    if (!skill) return
    toggleSkill(skill)
    setNewSkill('')
  }

  // Biodata fields (gender, phone, birth date, birthplace, address, career).
  const [biodata, setBiodata] = useState({
    gender: '',
    phone: '',
    birth_date: '',
    birthplace: '',
    birthplace_regency: '',
    birthplace_province: '',
    address: '',
    employment_status: '',
    company_name: '',
    position: '',
    business_field: '',
    business_start_year: '',
    location: '',
    work_province: '',
    work_city: '',
    study_institution: '',
    study_program: '',
    study_entry_year: '',
    business_name: '',
    business_address: '',
    business_province: '',
    business_city: '',
  })
  const [biodataTouched, setBiodataTouched] = useState(false)
  const [biodataError, setBiodataError] = useState<string | null>(null)
  const [bioProvinceId, setBioProvinceId] = useState('')
  const [bioRegencyId, setBioRegencyId] = useState('')
  const [bioDistrictId, setBioDistrictId] = useState('')

  const provincesQuery = useProvinces()
  const bioRegenciesQuery = useRegencies(bioProvinceId || null)
  const bioDistrictsQuery = useDistricts(bioRegencyId || null)

  useEffect(() => {
    if (biodataTouched || !biodataSource) return
    setBiodata({
      gender: biodataSource.gender ?? '',
      phone: biodataSource.phone ?? '',
      birth_date: biodataSource.birth_date ? biodataSource.birth_date.slice(0, 10) : '',
      birthplace: biodataSource.birthplace ?? '',
      birthplace_regency: biodataSource.birthplace_regency ?? '',
      birthplace_province: biodataSource.birthplace_province ?? '',
      address: biodataSource.address ?? '',
      employment_status: alumni?.employment_status ?? '',
      company_name: alumni?.company_name ?? '',
      position: alumni?.position ?? '',
      business_field: alumni?.business_field ?? '',
      business_start_year: alumni?.business_start_year ? String(alumni.business_start_year) : '',
      location: alumni?.location ?? '',
      work_province: alumni?.work_province ?? '',
      work_city: alumni?.work_city ?? '',
      study_institution: alumni?.study_institution ?? '',
      study_program: alumni?.study_program ?? '',
      study_entry_year: alumni?.study_entry_year ? String(alumni.study_entry_year) : '',
      business_name: alumni?.business_name ?? '',
      business_address: alumni?.business_address ?? '',
      business_province: alumni?.business_province ?? '',
      business_city: alumni?.business_city ?? '',
    })
  }, [biodataSource, alumni, biodataTouched])

  // Resolve the stored birthplace names into the region dropdown selections.
  useEffect(() => {
    if (biodataTouched || !biodataSource || !provincesQuery.data) return
    const province = provincesQuery.data.find((p) => p.name === biodataSource.birthplace_province)
    setBioProvinceId(province?.id ?? '')
  }, [biodataSource, biodataTouched, provincesQuery.data])

  useEffect(() => {
    if (biodataTouched || !biodataSource || !bioRegenciesQuery.data || !bioProvinceId) return
    const regency = bioRegenciesQuery.data.find((r) => r.name === biodataSource.birthplace_regency)
    setBioRegencyId(regency?.id ?? '')
  }, [biodataSource, biodataTouched, bioProvinceId, bioRegenciesQuery.data])

  useEffect(() => {
    if (biodataTouched || !biodataSource || !bioDistrictsQuery.data || !bioRegencyId) return
    const district = bioDistrictsQuery.data.find((d) => d.name === biodataSource.birthplace)
    setBioDistrictId(district?.id ?? '')
  }, [biodataSource, biodataTouched, bioRegencyId, bioDistrictsQuery.data])

  const setBiodataField = (key: keyof typeof biodata, value: string) => {
    setBiodataTouched(true)
    setBiodata((b) => ({ ...b, [key]: value }))
  }

  const onBioProvinceChange = (id: string) => {
    setBiodataTouched(true)
    setBioProvinceId(id)
    setBioRegencyId('')
    setBioDistrictId('')
    setBiodata((b) => ({
      ...b,
      birthplace_province: provincesQuery.data?.find((p) => String(p.id) === id)?.name ?? '',
      birthplace_regency: '',
      birthplace: '',
    }))
  }

  const onBioRegencyChange = (id: string) => {
    setBiodataTouched(true)
    setBioRegencyId(id)
    setBioDistrictId('')
    setBiodata((b) => ({
      ...b,
      birthplace_regency: bioRegenciesQuery.data?.find((r) => String(r.id) === id)?.name ?? '',
      birthplace: '',
    }))
  }

  const onBioDistrictChange = (id: string) => {
    setBiodataTouched(true)
    setBioDistrictId(id)
    setBiodata((b) => ({
      ...b,
      birthplace: bioDistrictsQuery.data?.find((d) => String(d.id) === id)?.name ?? '',
    }))
  }

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

  const onSubmitAlumniInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlumniError(null)
    try {
      await updateProfile.mutateAsync({
        name: profile.name,
        email: profile.email,
        nis: alumniForm.nis.trim() || null,
        nisn: alumniForm.nisn.trim() || null,
        // Drop social rows the user added but left blank.
        socials: alumniForm.socials.filter((s) => s.url.trim() !== ''),
        skills: alumniForm.skills,
      })
      setAlumniTouched(false)
      toast('Informasi alumni berhasil diperbarui')
    } catch (err) {
      setAlumniError(apiError(err))
    }
  }

  const onSubmitBiodata = async (e: React.FormEvent) => {
    e.preventDefault()
    setBiodataError(null)
    try {
      await updateProfile.mutateAsync({
        name: profile.name,
        email: profile.email,
        // Empty strings are sent as-is so the backend can clear the field.
        gender: biodata.gender,
        phone: biodata.phone.trim(),
        birth_date: biodata.birth_date,
        birthplace: biodata.birthplace,
        birthplace_regency: biodata.birthplace_regency,
        birthplace_province: biodata.birthplace_province,
        address: biodata.address.trim(),
        // Employment status & career details are alumni-specific — only sent
        // when linked. Empty strings clear the field on the backend.
        ...(alumni
          ? {
              employment_status: biodata.employment_status,
              company_name: biodata.company_name,
              position: biodata.position,
              business_field: biodata.business_field,
              business_start_year: biodata.business_start_year ? Number(biodata.business_start_year) : null,
              location: biodata.location,
              work_province: biodata.work_province,
              work_city: biodata.work_city,
              study_institution: biodata.study_institution,
              study_program: biodata.study_program,
              study_entry_year: biodata.study_entry_year ? Number(biodata.study_entry_year) : null,
              business_name: biodata.business_name,
              business_address: biodata.business_address,
              business_province: biodata.business_province,
              business_city: biodata.business_city,
            }
          : {}),
      })
      setBiodataTouched(false)
      toast('Biodata berhasil diperbarui')
    } catch (err) {
      setBiodataError(apiError(err))
    }
  }

  const role = user?.roles?.[0]
  const busy = uploadAvatar.isPending || deleteAvatar.isPending

  return (
    <div className="space-y-6">
      <PageHeader title="Profil" subtitle="Kelola foto profil, data diri, dan keamanan akun Anda" />

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/pengaturan"
          className="group flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Settings className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600">Pengaturan Akun</p>
            <p className="truncate text-xs text-slate-500">Kelola keamanan dan ubah password</p>
          </div>
        </Link>
        <Link
          to="/bantuan"
          className="group flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <LifeBuoy className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600">Bantuan</p>
            <p className="truncate text-xs text-slate-500">Panduan, FAQ, dan dukungan</p>
          </div>
        </Link>
      </div>

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

        {/* Biodata — editable personal data (all roles) */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Biodata"
            subtitle={
              alumni
                ? 'Jenis kelamin, kontak, tempat & tanggal lahir, alamat, dan status pekerjaan'
                : 'Jenis kelamin, kontak, tempat & tanggal lahir, dan alamat'
            }
            actions={<ClipboardList className="size-4.5 text-slate-400" />}
          />
            <form id="biodata-form" onSubmit={onSubmitBiodata} className="space-y-5 px-5 py-5">
              {biodataError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  {biodataError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Jenis Kelamin">
                  <Select value={biodata.gender} onChange={(e) => setBiodataField('gender', e.target.value)}>
                    <option value="">Pilih…</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </Select>
                </Field>
                <Field label="No. HP" hint="Awali dengan 08 atau +62">
                  <Input
                    value={biodata.phone}
                    onChange={(e) => setBiodataField('phone', e.target.value)}
                    placeholder="081234567890"
                    maxLength={50}
                  />
                </Field>
                <Field label="Tanggal Lahir">
                  <Input
                    type="date"
                    value={biodata.birth_date}
                    onChange={(e) => setBiodataField('birth_date', e.target.value)}
                  />
                </Field>

                <Field label="Provinsi (Tempat Lahir)">
                  <Select value={bioProvinceId} onChange={(e) => onBioProvinceChange(e.target.value)}>
                    <option value="">Pilih provinsi</option>
                    {provincesQuery.data?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Kabupaten / Kota">
                  <Select
                    value={bioRegencyId}
                    disabled={!bioProvinceId}
                    onChange={(e) => onBioRegencyChange(e.target.value)}
                  >
                    <option value="">{bioProvinceId ? 'Pilih kabupaten/kota' : 'Pilih provinsi dahulu'}</option>
                    {bioRegenciesQuery.data?.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Kecamatan">
                  <Select
                    value={bioDistrictId}
                    disabled={!bioRegencyId}
                    onChange={(e) => onBioDistrictChange(e.target.value)}
                  >
                    <option value="">{bioRegencyId ? 'Pilih kecamatan' : 'Pilih kabupaten/kota dahulu'}</option>
                    {bioDistrictsQuery.data?.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Select>
                </Field>

                {/* Employment status is alumni-specific — hidden for other roles */}
                {alumni && (
                  <Field label="Status Pekerjaan">
                    <Select
                      value={biodata.employment_status}
                      onChange={(e) => setBiodataField('employment_status', e.target.value)}
                    >
                      <option value="">Pilih…</option>
                      <option value="working">Bekerja</option>
                      <option value="entrepreneur">Wirausaha</option>
                      <option value="continuing_study">Melanjutkan Studi</option>
                      <option value="unemployed">Mencari Kerja</option>
                    </Select>
                  </Field>
                )}

                {/* Career details — follow the chosen employment status */}
                {alumni && biodata.employment_status === 'working' && (
                  <>
                    <Field label="Nama Perusahaan">
                      <Input value={biodata.company_name} onChange={(e) => setBiodataField('company_name', e.target.value)} placeholder="Contoh: PT Maju Jaya" />
                    </Field>
                    <Field label="Posisi / Jabatan">
                      <Input value={biodata.position} onChange={(e) => setBiodataField('position', e.target.value)} placeholder="Contoh: Software Engineer" />
                    </Field>
                    <Field label="Bidang Usaha / Industri">
                      <Input value={biodata.business_field} onChange={(e) => setBiodataField('business_field', e.target.value)} placeholder="Contoh: Teknologi Informasi" />
                    </Field>
                    <Field label="Tahun Mulai Bekerja">
                      <Input
                        type="number"
                        min={1990}
                        value={biodata.business_start_year}
                        onChange={(e) => setBiodataField('business_start_year', e.target.value)}
                        placeholder="Contoh: 2020"
                      />
                    </Field>
                    <Field label="Provinsi Kerja">
                      <Input value={biodata.work_province} onChange={(e) => setBiodataField('work_province', e.target.value)} placeholder="Contoh: DKI Jakarta" />
                    </Field>
                    <Field label="Kota Kerja">
                      <Input value={biodata.work_city} onChange={(e) => setBiodataField('work_city', e.target.value)} placeholder="Contoh: Jakarta Selatan" />
                    </Field>
                    <Field label="Lokasi Kerja">
                      <Input value={biodata.location} onChange={(e) => setBiodataField('location', e.target.value)} placeholder="Contoh: Jakarta" />
                    </Field>
                  </>
                )}
                {alumni && biodata.employment_status === 'continuing_study' && (
                  <>
                    <Field label="Kuliah di">
                      <Input value={biodata.study_institution} onChange={(e) => setBiodataField('study_institution', e.target.value)} placeholder="Contoh: Universitas Indonesia" />
                    </Field>
                    <Field label="Jurusan / Prodi">
                      <Input value={biodata.study_program} onChange={(e) => setBiodataField('study_program', e.target.value)} placeholder="Contoh: Teknik Informatika" />
                    </Field>
                    <Field label="Tahun Masuk Kuliah">
                      <Input
                        type="number"
                        min={1990}
                        value={biodata.study_entry_year}
                        onChange={(e) => setBiodataField('study_entry_year', e.target.value)}
                        placeholder="Contoh: 2021"
                      />
                    </Field>
                  </>
                )}
                {alumni && biodata.employment_status === 'entrepreneur' && (
                  <>
                    <Field label="Nama Usaha">
                      <Input value={biodata.business_name} onChange={(e) => setBiodataField('business_name', e.target.value)} placeholder="Contoh: Toko Kopi Nusantara" />
                    </Field>
                    <Field label="Bidang Usaha">
                      <Input value={biodata.business_field} onChange={(e) => setBiodataField('business_field', e.target.value)} placeholder="Contoh: Kuliner" />
                    </Field>
                    <Field label="Tahun Mulai Usaha">
                      <Input
                        type="number"
                        min={1990}
                        value={biodata.business_start_year}
                        onChange={(e) => setBiodataField('business_start_year', e.target.value)}
                        placeholder="Contoh: 2021"
                      />
                    </Field>
                    <Field label="Provinsi Usaha">
                      <Input value={biodata.business_province} onChange={(e) => setBiodataField('business_province', e.target.value)} placeholder="Contoh: Jawa Barat" />
                    </Field>
                    <Field label="Kota Usaha">
                      <Input value={biodata.business_city} onChange={(e) => setBiodataField('business_city', e.target.value)} placeholder="Contoh: Bandung" />
                    </Field>
                    <Field label="Alamat Usaha">
                      <Input value={biodata.business_address} onChange={(e) => setBiodataField('business_address', e.target.value)} placeholder="Contoh: Jl. Raya No. 45, Jakarta Selatan" />
                    </Field>
                  </>
                )}

                <Field label="Alamat" className="sm:col-span-2 lg:col-span-3">
                  <Textarea
                    rows={3}
                    value={biodata.address}
                    onChange={(e) => setBiodataField('address', e.target.value)}
                    placeholder="Contoh: Jl. Merdeka No. 123, Bandung"
                  />
                </Field>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button type="submit" form="biodata-form" loading={updateProfile.isPending}>
                  <Save className="size-4" /> Simpan Biodata
                </Button>
              </div>
            </form>
          </Card>

        {/* Alumni info — editable NIS/NISN, social media, and skills */}
        {alumni && (
          <Card className="lg:col-span-2">
            <CardHeader
              title="Informasi Alumni"
              subtitle="NIS, NISN, sosial media, dan keahlian yang dapat Anda perbarui"
              actions={<GraduationCap className="size-4.5 text-slate-400" />}
            />
            <form id="alumni-form" onSubmit={onSubmitAlumniInfo} className="space-y-5 px-5 py-5">
              {alumniError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  {alumniError}
                </div>
              )}

              {/* Read-only academic summary (biodata fields live in the Biodata card) */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <ProfileInfo icon={GraduationCap} label="Jurusan" value={alumni.department} />
                <ProfileInfo
                  icon={CalendarDays}
                  label="Tahun Lulus"
                  value={alumni.graduation_year ? String(alumni.graduation_year) : null}
                />
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="NIS" hint="Nomor Induk Siswa">
                    <Input
                      value={alumniForm.nis}
                      onChange={(e) => setAlumniField('nis', e.target.value)}
                      maxLength={20}
                      placeholder="Contoh: 2022100101"
                    />
                  </Field>
                  <Field label="NISN" hint="Nomor Induk Siswa Nasional (10 digit)">
                    <Input
                      value={alumniForm.nisn}
                      onChange={(e) => setAlumniField('nisn', e.target.value)}
                      maxLength={10}
                      placeholder="Contoh: 0098765432"
                    />
                  </Field>
                </div>

                {/* Social media links */}
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Sosial Media</p>
                    <button
                      type="button"
                      onClick={addSocial}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-indigo-600 uppercase transition-colors hover:bg-indigo-50"
                    >
                      <Plus className="size-3" /> Tambah
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {alumniForm.socials.length === 0 && (
                      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-400">
                        Belum ada — klik Tambah untuk menautkan akun sosial media.
                      </p>
                    )}
                    {alumniForm.socials.map((social, i) => {
                      const platform = SOCIAL_PLATFORMS.find((p) => p.value === social.platform)
                      const PlatformIcon = platform?.icon ?? AtSign
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className="relative min-w-0 flex-1">
                            <PlatformIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="url"
                              value={social.url}
                              onChange={(e) => setSocial(i, { url: e.target.value })}
                              placeholder={`URL ${platform?.label ?? 'sosial'}`}
                              className="h-10 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                            />
                          </div>
                          <Select
                            value={social.platform}
                            onChange={(e) => setSocial(i, { platform: e.target.value })}
                            className="w-32 shrink-0"
                          >
                            {SOCIAL_PLATFORMS.map((p) => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </Select>
                          <button
                            type="button"
                            onClick={() => removeSocial(i)}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Hapus sosial media"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Skills */}
                <div className="mt-5">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Keahlian / Skills</p>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSkill()
                        }
                      }}
                      placeholder="Ketik skill lalu tekan Enter"
                      className="max-w-xs"
                    />
                    <Button type="button" variant="secondary" onClick={addSkill}>
                      <Plus className="size-4" /> Tambah
                    </Button>
                  </div>
                  {alumniForm.skills.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {alumniForm.skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className="text-indigo-400 hover:text-indigo-600"
                            aria-label={`Hapus ${skill}`}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2.5 text-xs text-slate-400">Belum ada keahlian ditambahkan.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button type="submit" form="alumni-form" loading={updateProfile.isPending}>
                  <Save className="size-4" /> Simpan Perubahan
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Password */}
        <Card className="lg:col-span-2">
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
