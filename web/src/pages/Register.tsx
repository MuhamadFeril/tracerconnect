import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  BookOpen,
  Briefcase,
  Building2,
  Camera,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  Image as ImageIcon,
  Lock,
  Mail,
  PencilLine,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'
import { apiError } from '../lib/api'
import { hasAdminRole, setSession } from '../lib/auth'
import {
  useDistricts,
  useInstitutionOptions,
  useProvinces,
  useRegister,
  useRegencies,
  useUploadAvatar,
} from '../hooks/queries'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import { useToast } from '../components/ui/Toast'

/* ------------------------------------------------------------------ */
/* Constants & data                                                    */
/* ------------------------------------------------------------------ */

const STEP_LABELS = ['Informasi Akun', 'Informasi lanjut', 'Status Karir']

const DEPARTMENTS = [
  'Rekayasa Perangkat Lunak',
  'Teknik Komputer dan Jaringan',
  'Multimedia',
  'Akuntansi',
  'Pemasaran',
  'Desain Komunikasi Visual',
  'Teknik Elektronika Industri',
  'Perhotelan',
]

const SKILLS = [
  'JavaScript',
  'PHP',
  'Python',
  'UI/UX Design',
  'Public Speaking',
  'Desain Grafis',
  'Networking',
  'Digital Marketing',
  'Data Analysis',
  'Mobile Development',
]

const SOCIAL_PLATFORMS = [
  { value: 'facebook', label: 'Facebook', icon: AtSign },
  { value: 'instagram', label: 'Instagram', icon: Camera },
  { value: 'linkedin', label: 'LinkedIn', icon: Globe },
]

const CAREERS = [
  { key: 'working', label: 'Bekerja', caption: 'Working', icon: Briefcase },
  { key: 'continuing_study', label: 'Kuliah', caption: 'Studying', icon: GraduationCap },
  { key: 'entrepreneur', label: 'Wirausaha', caption: 'Entrepreneur', icon: Store },
  { key: 'unemployed', label: 'Mencari Kerja', caption: 'Unemployed', icon: Search },
  { key: 'active_student', label: 'Siswa Aktif', caption: 'Active Student', icon: BookOpen },
]

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function GoogleLogo() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
      />
    </svg>
  )
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="relative mx-auto max-w-xl">
      {/* Connecting line */}
      <div className="absolute top-5 right-[16%] left-[16%] h-0.5 bg-slate-200" aria-hidden="true" />
      <div
        className="absolute top-5 left-[16%] h-0.5 bg-slate-900 transition-all duration-500"
        style={{ width: `${(current / (STEP_LABELS.length - 1)) * 68}%` }}
        aria-hidden="true"
      />
      <div className="relative flex justify-between">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1
          const done = step < current
          const active = step === current
          return (
            <div key={label} className="flex w-24 flex-col items-center gap-2">
              <div
                className={clsx(
                  'flex size-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
                  done || active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/20'
                    : 'border-slate-200 bg-white text-slate-400',
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : step}
              </div>
              <p
                className={clsx(
                  'text-center text-[11px] leading-tight font-semibold',
                  active || done ? 'text-slate-900' : 'text-slate-400',
                )}
              >
                {label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StepHeader({ step }: { step: number }) {
  const progress = Math.round(((step - 1) / (STEP_LABELS.length - 1)) * 100)
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Step {step} dari {STEP_LABELS.length} : {STEP_LABELS[step - 1]}
        </h1>
        <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500">
          {progress}% Progres
        </span>
      </div>
      <div className="mt-6">
        <Stepper current={step} />
      </div>
    </div>
  )
}

function CardHeader({
  icon,
  title,
  step,
}: {
  icon: React.ReactNode
  title: string
  step: number
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
      </div>
      <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-bold tracking-wide text-indigo-600 uppercase">
        Langkah {step} dari {STEP_LABELS.length}
      </span>
    </div>
  )
}

function Label({
  label,
  htmlFor,
  required,
  optional,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  optional?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-bold tracking-wide text-slate-800 uppercase">
      {label} {required && <span className="text-rose-500">*</span>}
      {optional && <span className="font-medium text-slate-400 normal-case">(opsional)</span>}
    </label>
  )
}

function Helper({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-slate-400 italic">{children}</p>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs font-medium text-rose-600">{message}</p>
}

/* ------------------------------------------------------------------ */
/* Step 1 — Informasi Akun                                             */
/* ------------------------------------------------------------------ */

function AccountStep({
  email,
  setEmail,
  password,
  setPassword,
  confirmation,
  setConfirmation,
  institutionId,
  setInstitutionId,
  institutions,
  errors,
}: {
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  confirmation: string
  setConfirmation: (v: string) => void
  institutionId: string
  setInstitutionId: (v: string) => void
  institutions: { id: string; name: string; code: string | null }[]
  errors: Record<string, string>
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const passwordIcon = (open: boolean) =>
    open ? <EyeOff className="size-4" /> : <Eye className="size-4" />

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader icon={<Lock className="size-5" />} title="Pengaturan Akun" step={1} />
      <div className="space-y-5 px-6 py-6">
        <div>
          <Label label="Email" htmlFor="reg-email" required />
          <div className="relative mt-2">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              id="reg-email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={clsx(
                'w-full rounded-lg border bg-white py-2.5 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400',
                'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                errors.email ? 'border-rose-400' : 'border-slate-300',
              )}
            />
          </div>
          <Helper>pastikan email Anda aktif dan valid</Helper>
          <FieldError message={errors.email} />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label label="Password" htmlFor="reg-password" required />
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="reg-password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Buat password"
                className={clsx(
                  'w-full rounded-lg border bg-white py-2.5 pr-10 pl-10 text-sm text-slate-900 placeholder:text-slate-400',
                  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                  errors.password ? 'border-rose-400' : 'border-slate-300',
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {passwordIcon(showPassword)}
              </button>
            </div>
            <Helper>minimal 8 karakter</Helper>
            <FieldError message={errors.password} />
          </div>

          <div>
            <Label label="Konfirmasi Password" htmlFor="reg-confirmation" required />
            <div className="relative mt-2">
              <ShieldCheck className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirmation ? 'text' : 'password'}
                id="reg-confirmation"
                name="password_confirmation"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Ulangi password"
                className={clsx(
                  'w-full rounded-lg border bg-white py-2.5 pr-10 pl-10 text-sm text-slate-900 placeholder:text-slate-400',
                  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                  errors.confirmation ? 'border-rose-400' : 'border-slate-300',
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmation((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                aria-label={showConfirmation ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {passwordIcon(showConfirmation)}
              </button>
            </div>
            <Helper>minimal 8 karakter</Helper>
            <FieldError message={errors.confirmation} />
          </div>
        </div>

        <div>
          <Label label="Institusi / Sekolah" htmlFor="reg-institution" required />
          <div className="relative mt-2">
            <Building2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <select
              id="reg-institution"
              name="institution_id"
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              className={clsx(
                'w-full appearance-none rounded-lg border bg-white py-2.5 pr-9 pl-10 text-sm text-slate-900',
                'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                errors.institution ? 'border-rose-400' : 'border-slate-300',
              )}
            >
              <option value="">
                {institutions.length > 0 ? 'Pilih institusi Anda…' : 'Memuat daftar institusi…'}
              </option>
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                  {institution.code ? ` (${institution.code})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <Helper>pilih sekolah/kampus agar data alumni Anda tersambung</Helper>
          <FieldError message={errors.institution} />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              atau daftar dengan
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        >
          <GoogleLogo /> Login dengan Google
        </Button>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Step 2 — Informasi lanjut                                            */
/* ------------------------------------------------------------------ */

interface SocialRow {
  platform: string
  url: string
}

function InfoStep({
  form,
  update,
  errors,
  photoPreview,
  onPhotoChange,
  provinces,
  provinceId,
  onProvinceChange,
  regencies,
  regencyId,
  onRegencyChange,
  districts,
  districtId,
  onDistrictChange,
}: {
  form: {
    name: string
    department: string
    gender: string
    phone: string
    nis: string
    nisn: string
    yearIn: string
    yearOut: string
    birthplace: string
    birthDate: string
    address: string
    skills: string[]
    socials: SocialRow[]
  }
  update: (patch: Partial<typeof form>) => void
  errors: Record<string, string>
  photoPreview: string | null
  onPhotoChange: (file: File | null) => void
  provinces: { id: string; name: string }[]
  provinceId: string
  onProvinceChange: (id: string) => void
  regencies: { id: string; name: string }[]
  regencyId: string
  onRegencyChange: (id: string, name: string) => void
  districts: { id: string; name: string }[]
  districtId: string
  onDistrictChange: (id: string, name: string) => void
}) {
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 12 }, (_, i) => String(current - i))
  }, [])

  const selectClass = (invalid?: boolean) =>
    clsx(
      'w-full appearance-none rounded-lg border bg-white py-2.5 pr-9 pl-3 text-sm text-slate-900',
      'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
      invalid ? 'border-rose-400' : 'border-slate-300',
    )

  const handlePhoto = (file: File | null) => {
    setPhotoError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Format file harus berupa foto (PNG/JPG/WebP)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Ukuran foto maksimal 2MB')
      return
    }
    onPhotoChange(file)
  }

  const toggleSkill = (skill: string) => {
    const next = form.skills.includes(skill)
      ? form.skills.filter((s) => s !== skill)
      : [...form.skills, skill]
    update({ skills: next })
  }

  const setSocial = (index: number, patch: Partial<SocialRow>) => {
    const next = [...form.socials]
    next[index] = { ...next[index], ...patch }
    update({ socials: next })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader icon={<UserRound className="size-5" />} title="Personal Info" step={2} />

      <div className="grid grid-cols-1 gap-x-5 gap-y-5 px-6 py-6 sm:grid-cols-2">
        <div>
          <Label label="Nama Lengkap" htmlFor="reg-name" required />
          <input
            type="text"
            id="reg-name"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Nama lengkap Anda"
            className={clsx(
              'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
              'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
              errors.name ? 'border-rose-400' : 'border-slate-300',
            )}
          />
          <FieldError message={errors.name} />
        </div>

        <div>
          <Label label="Jurusan" htmlFor="reg-department" required />
          <div className="relative mt-2">
            <select
              id="reg-department"
              name="department"
              value={form.department}
              onChange={(e) => update({ department: e.target.value })}
              className={clsx(selectClass(Boolean(errors.department)), errors.department && 'border-rose-400')}
            >
              <option value="">Pilih jurusan</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <FieldError message={errors.department} />
        </div>

        <div>
          <Label label="Jenis Kelamin" htmlFor="reg-gender" required />
          <div className="relative mt-2">
            <select
              id="reg-gender"
              name="gender"
              value={form.gender}
              onChange={(e) => update({ gender: e.target.value })}
              className={clsx(selectClass(Boolean(errors.gender)), errors.gender && 'border-rose-400')}
            >
              <option value="">Pilih...</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <FieldError message={errors.gender} />
        </div>

        <div>
          <Label label="No HP" htmlFor="reg-phone" required />
          <div className="relative mt-2">
            <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="tel"
              id="reg-phone"
              name="phone"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="081..."
              className={clsx(
                'w-full rounded-lg border bg-white py-2.5 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400',
                'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                errors.phone ? 'border-rose-400' : 'border-slate-300',
              )}
            />
          </div>
          <Helper>minimal 10 karakter</Helper>
          <FieldError message={errors.phone} />
        </div>

        <div>
          <Label label="NIS" htmlFor="reg-nis" required />
          <input
            type="text"
            id="reg-nis"
            name="nis"
            value={form.nis}
            onChange={(e) => update({ nis: e.target.value })}
            placeholder="Masukkan NIS (10 karakter)"
            className={clsx(
              'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
              'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
              errors.nis ? 'border-rose-400' : 'border-slate-300',
            )}
          />
          <Helper>tepat 10 karakter</Helper>
          <FieldError message={errors.nis} />
        </div>

        <div>
          <Label label="NISN" htmlFor="reg-nisn" required />
          <input
            type="text"
            id="reg-nisn"
            name="nisn"
            value={form.nisn}
            onChange={(e) => update({ nisn: e.target.value })}
            placeholder="Masukkan NISN (10 karakter)"
            className={clsx(
              'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
              'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
              errors.nisn ? 'border-rose-400' : 'border-slate-300',
            )}
          />
          <Helper>tepat 10 karakter</Helper>
          <FieldError message={errors.nisn} />
        </div>

        <div>
          <Label label="Tahun Masuk" htmlFor="reg-year-in" required />
          <div className="relative mt-2">
            <select
              id="reg-year-in"
              name="entry_year"
              value={form.yearIn}
              onChange={(e) => update({ yearIn: e.target.value })}
              className={clsx(selectClass(Boolean(errors.yearIn)), errors.yearIn && 'border-rose-400')}
            >
              <option value="">Pilih Tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <FieldError message={errors.yearIn} />
        </div>

        <div>
          <Label label="Tahun Lulus" htmlFor="reg-year-out" required />
          <div className="relative mt-2">
            <select
              id="reg-year-out"
              name="graduation_year"
              value={form.yearOut}
              onChange={(e) => update({ yearOut: e.target.value })}
              className={clsx(selectClass(Boolean(errors.yearOut)), errors.yearOut && 'border-rose-400')}
            >
              <option value="">Pilih Tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <FieldError message={errors.yearOut} />
        </div>

        <div>
          <Label label="Provinsi (Tempat Lahir)" htmlFor="reg-province" required />
          <div className="relative mt-2">
            <select
              id="reg-province"
              name="birthplace_province"
              value={provinceId}
              onChange={(e) => onProvinceChange(e.target.value)}
              className={clsx(selectClass(Boolean(errors.province)), errors.province && 'border-rose-400')}
            >
              <option value="">Pilih provinsi</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <FieldError message={errors.province} />
        </div>

        <div>
          <Label label="Kabupaten/Kota" htmlFor="reg-birthplace" required />
          <div className="relative mt-2">
            <select
              id="reg-birthplace"
              name="birthplace_regency"
              value={regencyId}
              disabled={!provinceId}
              onChange={(e) => {
                const regency = regencies.find((r) => String(r.id) === e.target.value)
                onRegencyChange(e.target.value, regency?.name ?? '')
              }}
              className={clsx(
                selectClass(Boolean(errors.birthplace)),
                errors.birthplace && 'border-rose-400',
                !provinceId && 'cursor-not-allowed opacity-60',
              )}
            >
              <option value="">{provinceId ? 'Pilih kabupaten/kota' : 'Pilih provinsi dahulu'}</option>
              {regencies.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <FieldError message={errors.birthplace} />
        </div>

        <div>
          <Label label="Kecamatan (Tempat Lahir)" htmlFor="reg-district" required />
          <div className="relative mt-2">
            <select
              id="reg-district"
              name="birthplace"
              value={districtId}
              disabled={!regencyId}
              onChange={(e) => {
                const district = districts.find((d) => String(d.id) === e.target.value)
                onDistrictChange(e.target.value, district?.name ?? '')
              }}
              className={clsx(
                selectClass(Boolean(errors.district)),
                errors.district && 'border-rose-400',
                !regencyId && 'cursor-not-allowed opacity-60',
              )}
            >
              <option value="">{regencyId ? 'Pilih kecamatan' : 'Pilih kabupaten/kota dahulu'}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <FieldError message={errors.district} />
        </div>

        <div>
          <Label label="Tanggal Lahir" htmlFor="reg-birthdate" required />
          <input
            type="date"
            id="reg-birthdate"
            name="birth_date"
            value={form.birthDate}
            onChange={(e) => update({ birthDate: e.target.value })}
            className={clsx(
              'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900',
              'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
              errors.birthDate ? 'border-rose-400' : 'border-slate-300',
            )}
          />
          <FieldError message={errors.birthDate} />
        </div>

        <div>
          <Label label="Alamat" htmlFor="reg-address" required />
          <textarea
            rows={3}
            id="reg-address"
            name="address"
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="Contoh: Jl. Merdeka No. 123, RT 01/RW 02, Desa Maju..."
            className={clsx(
              'mt-2 w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
              'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
              errors.address ? 'border-rose-400' : 'border-slate-300',
            )}
          />
          <FieldError message={errors.address} />
        </div>

        <div>
          <Label label="Foto" htmlFor="reg-photo" optional />
          <div className="mt-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              id="reg-photo"
              className="hidden"
              onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
            />
            {photoPreview ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <img
                  src={photoPreview}
                  alt="Pratinjau foto profil"
                  className="size-12 rounded-lg border border-slate-200 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">Foto dipilih</p>
                  <button
                    type="button"
                    onClick={() => {
                      onPhotoChange(null)
                      if (fileRef.current) fileRef.current.value = ''
                    }}
                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-500"
                  >
                    <Trash2 className="size-3" /> Hapus foto
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                  <ImageIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Upload className="size-3.5" /> Pilih File
                  </span>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Masukkan file dengan format foto dengan ukuran maksimal 2MB (Contoh: PNG/JPG)
                  </p>
                </div>
              </button>
            )}
          </div>
          <FieldError message={photoError ?? errors.photo} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label label="Sosial Media" optional />
            <button
              type="button"
              onClick={() => update({ socials: [...form.socials, { platform: 'facebook', url: '' }] })}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-indigo-600 uppercase transition-colors hover:bg-indigo-50"
            >
              <Plus className="size-3" /> Tambah
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {form.socials.length === 0 && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-400">
                Belum ada — klik Tambah untuk menautkan akun sosial media.
              </p>
            )}
            {form.socials.map((social, i) => {
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
                      placeholder={`Url ${platform?.label ?? 'Sosial'}`}
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                    />
                  </div>
                  <select
                    value={social.platform}
                    onChange={(e) => setSocial(i, { platform: e.target.value })}
                    className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => update({ socials: form.socials.filter((_, idx) => idx !== i) })}
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

        <div>
          <Label label="Keahlian / Skills" htmlFor="reg-skills" />
          <div className="relative mt-2">
            <select
              id="reg-skills"
              value=""
              onChange={(e) => {
                if (e.target.value) toggleSkill(e.target.value)
              }}
              className={selectClass()}
            >
              <option value="">Cari skill...</option>
              {SKILLS.filter((s) => !form.skills.includes(s)).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          {form.skills.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {form.skills.map((skill) => (
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
          )}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Step 3 — Status Karir                                                */
/* ------------------------------------------------------------------ */

function CareerStep({
  career,
  setCareer,
  error,
}: {
  career: string | null
  setCareer: (v: string) => void
  error?: string
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-6 py-6">
        <h2 className="text-base font-bold tracking-tight text-slate-900">
          Seperti apa karir anda sekarang? <span className="text-rose-500">*</span>
        </h2>
        {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CAREERS.map((item) => {
            const selected = career === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setCareer(item.key)}
                className={clsx(
                  'relative flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-4 text-center transition-all',
                  selected
                    ? 'border-slate-900 bg-slate-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/60',
                )}
              >
                {selected && (
                  <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-slate-900 text-white shadow">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
                <item.icon
                  className={clsx('size-5', selected ? 'text-slate-900' : 'text-slate-400')}
                />
                <span
                  className={clsx(
                    'text-sm font-bold',
                    selected ? 'text-slate-900' : 'text-slate-600',
                  )}
                >
                  {item.label}
                </span>
                <span className="text-[11px] text-slate-400">({item.caption})</span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-4 text-center">
          <p className="text-sm text-slate-400 italic">
            Semangat! Tetaplah berusaha dan tingkatkan skill Anda.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export function Register() {
  const navigate = useNavigate()
  const toast = useToast()
  const register = useRegister()
  const uploadAvatar = useUploadAvatar()
  const institutionsQuery = useInstitutionOptions()

  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [provinceId, setProvinceId] = useState('')
  const [provinceName, setProvinceName] = useState('')
  const [regencyId, setRegencyId] = useState('')
  const [regencyName, setRegencyName] = useState('')
  const [districtId, setDistrictId] = useState('')

  const provincesQuery = useProvinces()
  const regenciesQuery = useRegencies(provinceId || null)
  const districtsQuery = useDistricts(regencyId || null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [institutionId, setInstitutionId] = useState('')

  const [form, setForm] = useState({
    name: '',
    department: '',
    gender: '',
    phone: '',
    nis: '',
    nisn: '',
    yearIn: '',
    yearOut: '',
    birthplace: '',
    birthDate: '',
    address: '',
    skills: [] as string[],
    socials: [] as SocialRow[],
  })
  const [career, setCareer] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const onPhotoChange = (file: File | null) => {
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  const handleProvinceChange = (id: string) => {
    setProvinceId(id)
    setProvinceName(provincesQuery.data?.find((p) => String(p.id) === id)?.name ?? '')
    setRegencyId('')
    setRegencyName('')
    setDistrictId('')
    setForm((f) => ({ ...f, birthplace: '' }))
  }

  const handleRegencyChange = (id: string, name: string) => {
    setRegencyId(id)
    setRegencyName(name)
    setDistrictId('')
    setForm((f) => ({ ...f, birthplace: '' }))
  }

  const handleDistrictChange = (id: string, name: string) => {
    setDistrictId(id)
    setForm((f) => ({ ...f, birthplace: name }))
  }

  const validateStep = (target: number): boolean => {
    const next: Record<string, string> = {}

    if (target === 1) {
      if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Masukkan email yang valid'
      if (password.length < 8) next.password = 'Password minimal 8 karakter'
      if (confirmation !== password || !confirmation) {
        next.confirmation = 'Konfirmasi password tidak cocok'
      }
      // Alumni records are tenant-scoped, so an institution is required to
      // persist the profile data collected in steps 2 & 3.
      if (!institutionId) next.institution = 'Pilih institusi Anda'
    }

    if (target === 2) {
      if (!form.name.trim()) next.name = 'Nama lengkap wajib diisi'
      if (!form.department) next.department = 'Pilih jurusan'
      if (!form.gender) next.gender = 'Pilih jenis kelamin'
      if (!form.phone.trim()) next.phone = 'No HP wajib diisi'
      else if (form.phone.trim().length < 10) next.phone = 'No HP minimal 10 karakter'
      if (!form.nis.trim()) next.nis = 'NIS wajib diisi'
      else if (form.nis.trim().length !== 10) next.nis = 'NIS harus tepat 10 karakter'
      if (!form.nisn.trim()) next.nisn = 'NISN wajib diisi'
      else if (form.nisn.trim().length !== 10) next.nisn = 'NISN harus tepat 10 karakter'
      if (!form.yearIn) next.yearIn = 'Pilih tahun masuk'
      if (!form.yearOut) next.yearOut = 'Pilih tahun lulus'
      if (form.yearIn && form.yearOut && Number(form.yearOut) - Number(form.yearIn) < 2) {
        next.yearOut = 'Tahun lulus minimal 2 tahun setelah tahun masuk'
      }
      if (!provinceId) next.province = 'Pilih provinsi'
      if (!regencyId) next.birthplace = 'Pilih kabupaten/kota'
      if (!districtId) next.district = 'Pilih kecamatan'
      if (!form.birthDate) next.birthDate = 'Pilih tanggal lahir'
      if (!form.address.trim()) next.address = 'Alamat wajib diisi'
    }

    if (target === 3 && !career) next.career = 'Pilih salah satu status karir'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const goNext = () => {
    setError(null)
    if (!validateStep(step)) return
    setStep((s) => Math.min(s + 1, 3))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setError(null)
    setStep((s) => Math.max(s - 1, 1))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (step < 3) {
      goNext()
      return
    }
    if (!validateStep(3)) return

    setSubmitting(true)
    try {
      const data = await register.mutateAsync({
        name: form.name,
        email,
        password,
        password_confirmation: confirmation,
        institution_id: institutionId || undefined,
        gender: form.gender || undefined,
        phone: form.phone || undefined,
        nis: form.nis || undefined,
        nisn: form.nisn || undefined,
        entry_year: form.yearIn ? Number(form.yearIn) : undefined,
        graduation_year: form.yearOut ? Number(form.yearOut) : undefined,
        birthplace: form.birthplace || undefined,
        birthplace_regency: regencyName || undefined,
        birthplace_province: provinceName || undefined,
        birth_date: form.birthDate || undefined,
        address: form.address || undefined,
        department: form.department || undefined,
        socials: form.socials.filter((s) => s.url.trim()).length
          ? form.socials.filter((s) => s.url.trim()).map((s) => ({ platform: s.platform, url: s.url.trim() }))
          : undefined,
        skills: form.skills.length ? form.skills : undefined,
        employment_status: career ?? undefined,
      })

      setSession(data.token, data.user)

      // Upload the chosen profile photo right after registration succeeds.
      if (photoFile) {
        try {
          await uploadAvatar.mutateAsync(photoFile)
        } catch {
          // Non-fatal: account was created; photo can be set later from Profile.
          toast('Akun dibuat, tetapi foto gagal diunggah', 'error')
        }
      }

      navigate(hasAdminRole(data.user) ? '/dashboard' : '/home', { replace: true })
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const institutions = institutionsQuery.data ?? []

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <Logo className="size-10 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-tight text-slate-900">TracerConnect</p>
              <p className="hidden truncate text-[11px] text-slate-400 sm:block">Pendaftaran Alumni</p>
            </div>
          </Link>
          <Link
            to="/login"
            className="shrink-0 text-[13px] font-medium whitespace-nowrap text-slate-500 transition-colors hover:text-slate-900"
          >
            <span className="hidden sm:inline">Sudah punya akun? </span>Masuk →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
        <StepHeader step={step} />

        <form className="mt-10 space-y-6" onSubmit={onSubmit}>
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {step === 1 && (
            <AccountStep
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              confirmation={confirmation}
              setConfirmation={setConfirmation}
              institutionId={institutionId}
              setInstitutionId={setInstitutionId}
              institutions={institutions}
              errors={errors}
            />
          )}

          {step === 2 && (
            <InfoStep
              form={form}
              update={update}
              errors={errors}
              photoPreview={photoPreview}
              onPhotoChange={onPhotoChange}
              provinces={provincesQuery.data ?? []}
              provinceId={provinceId}
              onProvinceChange={handleProvinceChange}
              regencies={regenciesQuery.data ?? []}
              regencyId={regencyId}
              onRegencyChange={handleRegencyChange}
              districts={districtsQuery.data ?? []}
              districtId={districtId}
              onDistrictChange={handleDistrictChange}
            />
          )}

          {step === 3 && (
            <CareerStep career={career} setCareer={setCareer} error={errors.career} />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="secondary" type="button" onClick={goBack} disabled={step === 1 || submitting} className="border-slate-300">
              <ArrowLeft className="size-4" /> Kembali
            </Button>
            {step < 3 ? (
              <Button type="submit" className="text-[15px]">
                Lanjut <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="submit" loading={submitting} className="text-[15px]">
                <PencilLine className="size-4" /> Daftar Sekarang
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-slate-400">
            Dengan mendaftar, Anda menyetujui{' '}
            <a href="#syarat" className="underline hover:text-slate-600">Syarat &amp; Ketentuan</a> dan{' '}
            <a href="#privasi" className="underline hover:text-slate-600">Kebijakan Privasi</a> TracerConnect.
          </p>
        </form>
      </main>
    </div>
  )
}
