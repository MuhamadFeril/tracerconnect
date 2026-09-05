import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
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
  X,
} from 'lucide-react'
import { apiError } from '../lib/api'
import { getUser, hasAdminRole, setSession } from '../lib/auth'
import { useLocation } from 'react-router-dom'
import { useDebounce } from '../hooks/useDebounce'
import type { LoginResponse } from '../lib/types'
import {
  useDepartmentOptions,
  useDistricts,
  useInstitutionOptions,
  useProvinces,
  useCompleteGoogleRegistration,
  useRegister,
  useRegencies,
  useResendOtp,
  useStudyPrograms,
  useUniversities,
  useUploadAvatar,
  useVerifyOtp,
} from '../hooks/queries'
import { Button } from '../components/ui/Button'
import { AuthLayout } from '../components/auth/AuthLayout'
import { GoogleErrorNotice } from '../components/auth/GoogleErrorNotice'
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { LagLoader } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

/* ------------------------------------------------------------------ */
/* Constants & data                                                    */
/* ------------------------------------------------------------------ */

const STEP_LABELS = ['Informasi Akun', 'Informasi lanjut', 'Status Karir', 'Verifikasi']
const GOOGLE_STEP_LABELS = ['Biodata & Institusi', 'Status Karir', 'Verifikasi']

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

interface CareerDetails {
  companyName: string
  position: string
  businessField: string
  businessStartYear: string
  workProvince: string
  workCity: string
  studyInstitution: string
  studyProgram: string
  studyEntryYear: string
  businessName: string
  businessAddress: string
  businessProvince: string
  businessCity: string
}

const CAREERS = [
  { key: 'working', label: 'Bekerja', caption: 'Working', icon: Briefcase },
  { key: 'continuing_study', label: 'Kuliah', caption: 'Studying', icon: GraduationCap },
  { key: 'entrepreneur', label: 'Wirausaha', caption: 'Entrepreneur', icon: Store },
  { key: 'unemployed', label: 'Mencari Kerja', caption: 'Unemployed', icon: Search },
]

/**
 * Lightweight password strength meter used on the registration step 1.
 * Scores 0–4 based on length, uppercase, digits, and symbols.
 */
function passwordStrength(pw: string): { score: number; label: string; bar: string; text: string } {
  if (!pw) return { score: 0, label: '', bar: 'bg-slate-200', text: 'text-slate-400' }

  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  const levels = [
    { label: 'Lemah', bar: 'bg-rose-500', text: 'text-rose-500' },
    { label: 'Cukup', bar: 'bg-amber-400', text: 'text-amber-500' },
    { label: 'Kuat', bar: 'bg-emerald-400', text: 'text-emerald-600' },
    { label: 'Sangat kuat', bar: 'bg-emerald-500', text: 'text-emerald-600' },
  ]

  return { score, ...levels[score - 1] }
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

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

function StepHeader({ step, labels = STEP_LABELS }: { step: number; labels?: string[] }) {
  const progress = Math.round(((step - 1) / (labels.length - 1)) * 100)
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Step {step} dari {labels.length} : {labels[step - 1]}
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

function RegionHint({
  isLoading,
  isError,
  onRetry,
}: {
  isLoading: boolean
  isError: boolean
  onRetry?: () => void
}) {
  if (isLoading) return <Helper>Memuat data wilayah…</Helper>
  if (isError) {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
      >
        Gagal memuat data wilayah — ketuk untuk coba lagi
      </button>
    )
  }
  return null
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
  const single = institutions.length === 1

  const strength = passwordStrength(password)

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
            {password && (
              <div className="mt-2 animate-fade-in-up">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={clsx(
                        'h-1 flex-1 rounded-full transition-colors duration-300',
                        i <= strength.score ? strength.bar : 'bg-slate-200',
                      )}
                    />
                  ))}
                </div>
                <p className={clsx('mt-1 text-[11px] font-medium', strength.text)}>{strength.label}</p>
              </div>
            )}
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

          {/* 1-tenant mode: single active school, so no picker is shown —
              the school is attached server-side on registration. */}
          {!single && (
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
                  {institutions.length === 0 && (
                    <option value="">Memuat daftar institusi…</option>
                  )}
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
          )}

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

        <GoogleSignInButton />

        <GoogleErrorNotice />
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
  regionStatus,
  onRegionRetry,
  departments,
  departmentsLoading,
  institutionId,
  onDepartmentRetry,
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
  regionStatus: {
    provinces: { isLoading: boolean; isError: boolean }
    regencies: { isLoading: boolean; isError: boolean }
    districts: { isLoading: boolean; isError: boolean }
  }
  onRegionRetry: (key: 'provinces' | 'regencies' | 'districts') => void
  departments: { id: string; name: string; code: string | null }[]
  departmentsLoading: boolean
  institutionId: string
  onDepartmentRetry: () => void
}) {
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const autoRetriedDepartments = useRef(false)

  // Self-heal: if the school already has majors but the first fetch came back
  // empty/failed (e.g. stale draft or a transient error), retry once — then
  // fall back to the manual "muat ulang" link.
  useEffect(() => {
    if (
      institutionId &&
      !departmentsLoading &&
      departments.length === 0 &&
      !autoRetriedDepartments.current
    ) {
      autoRetriedDepartments.current = true
      onDepartmentRetry()
    }
  }, [institutionId, departmentsLoading, departments.length, onDepartmentRetry])

  // Entry years: 1990 (matching the backend validation floor) up to the
  // current year — older alumni can pick their real entry year.
  const years = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: current - 1989 }, (_, i) => String(current - i)).reverse()
  }, [])

  // Graduation years follow the entry year: minimum entry + 3 (backend rule),
  // up to entry + 6. The range is also extended to include the current year so
  // recent graduates always have a valid option, while never showing years
  // far in the future that don't relate to the chosen entry year.
  const graduationYears = useMemo(() => {
    const current = new Date().getFullYear()
    const entry = form.yearIn ? Number(form.yearIn) : 0
    const start = Math.max(1990, entry + 3)
    const end = Math.max(current, entry + 6)
    if (start > end) return []
    return Array.from({ length: end - start + 1 }, (_, i) => String(start + i))
  }, [form.yearIn])

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
              disabled={departmentsLoading || departments.length === 0}
              className={clsx(
                selectClass(Boolean(errors.department)),
                errors.department && 'border-rose-400',
                (departmentsLoading || departments.length === 0) && 'cursor-not-allowed opacity-60',
              )}
            >
              <option value="">
                {departmentsLoading
                  ? 'Memuat jurusan…'
                  : departments.length === 0
                    ? institutionId
                      ? 'Jurusan belum tersedia'
                      : 'Pilih institusi terlebih dahulu'
                    : 'Pilih jurusan'}
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <FieldError message={errors.department} />
          {!departmentsLoading && departments.length === 0 && institutionId && (
            <button
              type="button"
              onClick={onDepartmentRetry}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
            >
              Jurusan belum tampil — ketuk untuk memuat ulang
            </button>
          )}
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
              maxLength={16}
              value={form.phone}
              onChange={(e) => update({ phone: e.target.value.slice(0, 16) })}
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
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            value={form.nis}
            onChange={(e) => update({ nis: e.target.value.slice(0, 10) })}
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
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            value={form.nisn}
            onChange={(e) => update({ nisn: e.target.value.slice(0, 10) })}
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
              onChange={(e) => {
                const value = e.target.value
                update({ yearIn: value })
                // Reset graduation year when it's no longer valid for the new
                // entry year (graduation must be >= entry + 3).
                if (form.yearOut && (!value || Number(form.yearOut) < Number(value) + 3)) {
                  update({ yearOut: '' })
                }
              }}
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
              disabled={!form.yearIn}
              className={clsx(
                selectClass(Boolean(errors.yearOut)),
                errors.yearOut && 'border-rose-400',
                !form.yearIn && 'cursor-not-allowed opacity-60',
              )}
            >
              <option value="">
                {form.yearIn ? 'Pilih tahun lulus' : 'Pilih tahun masuk dahulu'}
              </option>
              {graduationYears.map((y) => (
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
          <RegionHint
            isLoading={regionStatus.provinces.isLoading}
            isError={regionStatus.provinces.isError}
            onRetry={() => onRegionRetry('provinces')}
          />
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
          <RegionHint
            isLoading={regionStatus.regencies.isLoading}
            isError={regionStatus.regencies.isError}
            onRetry={() => onRegionRetry('regencies')}
          />
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
          <RegionHint
            isLoading={regionStatus.districts.isLoading}
            isError={regionStatus.districts.isError}
            onRetry={() => onRegionRetry('districts')}
          />
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
/* Searchable university combobox (4.700+ kampus di seluruh Indonesia) */
/* ------------------------------------------------------------------ */

function UniversitySelect({
  universities,
  value,
  onChange,
  onSearch,
  invalid,
}: {
  universities: { id: string; name: string; city: string | null }[]
  value: string
  onChange: (name: string) => void
  onSearch: (query: string) => void
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return universities.slice(0, 60)
    return universities
      .filter((u) => u.name.toLowerCase().includes(q))
      .slice(0, 80)
  }, [universities, query])

  return (
    <div ref={wrapRef} className="relative mt-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          role="combobox"
          data-testid="university-input"
          aria-expanded={open}
          value={open ? query : value}
          readOnly={!open}
          placeholder="Ketik untuk mencari universitas…"
          onFocus={() => {
            setOpen(true)
            setQuery('')
            onSearch('')
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            onSearch(e.target.value)
          }}
          className={clsx(
            'w-full rounded-lg border bg-white py-2.5 pr-9 pl-10 text-sm text-slate-900 placeholder:text-slate-400',
            'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
            invalid ? 'border-rose-400' : 'border-slate-300',
          )}
        />
        {value && !open ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Hapus universitas"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        ) : (
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
        )}
      </div>
      {open && (
        <div
          data-testid="university-dropdown"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-slate-400">Universitas tidak ditemukan</p>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onChange(u.name)
                  setOpen(false)
                }}
                className="block w-full border-b border-slate-50 px-3 py-2 text-left text-sm text-slate-800 transition-colors last:border-0 hover:bg-indigo-50"
              >
                {u.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 3 — Status Karir                                                */
/* ------------------------------------------------------------------ */

function CareerStep({
  career,
  setCareer,
  details,
  setDetails,
  errors,
  graduationYear,
}: {
  career: string | null
  setCareer: (v: string) => void
  details: {
    companyName: string
    position: string
    businessField: string
    businessStartYear: string
    workProvince: string
    workCity: string
    studyInstitution: string
    studyProgram: string
    studyEntryYear: string
    businessName: string
    businessAddress: string
    businessProvince: string
    businessCity: string
  }
  setDetails: (patch: Partial<CareerDetails>) => void
  errors: Record<string, string>
  graduationYear: string
}) {
  const provincesQuery = useProvinces()
  const provinces = provincesQuery.data ?? []
  const [workProvinceId, setWorkProvinceId] = useState('')
  const [bizProvinceId, setBizProvinceId] = useState('')
  const workRegenciesQuery = useRegencies(workProvinceId || null)
  const bizRegenciesQuery = useRegencies(bizProvinceId || null)
  const workRegencies = workRegenciesQuery.data ?? []
  const bizRegencies = bizRegenciesQuery.data ?? []
  const workCityId = workRegencies.find((r) => r.name === details.workCity)?.id ?? ''
  const bizCityId = bizRegencies.find((r) => r.name === details.businessCity)?.id ?? ''

  // The university combobox searches server-side (debounced) so the national
  // dataset (5.000+ kampus) is never downloaded in one shot. When a campus has
  // already been picked, also fetch it by name so its id stays resolvable for
  // the study-program dropdown.
  const [universitySearch, setUniversitySearch] = useState('')
  const debouncedUniversitySearch = useDebounce(universitySearch, 300)
  const universitiesQuery = useUniversities(
    debouncedUniversitySearch || details.studyInstitution || undefined,
  )
  const universities = universitiesQuery.data ?? []
  const selectedUniversityId =
    universities.find((u) => u.name === details.studyInstitution)?.id ?? ''
  const studyProgramsQuery = useStudyPrograms(selectedUniversityId || null)
  const studyPrograms = studyProgramsQuery.data ?? []

  // Years available for "tahun mulai bekerja/berusaha": 1990..current.
  const workYears = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: current - 1989 }, (_, i) => String(current - i)).reverse()
  }, [])

  // Study entry years start at graduation + 3 (backend rule) so invalid
  // options never appear; falls back to the recent years when the graduate
  // hasn't filled in their graduation year yet.
  const studyYears = useMemo(() => {
    const current = new Date().getFullYear()
    const graduation = graduationYear ? Number(graduationYear) : 0
    const start = Math.max(1990, graduation ? graduation + 3 : current - 10)
    const end = Math.max(current, graduation ? graduation + 6 : start)
    return Array.from({ length: end - start + 1 }, (_, i) => String(start + i))
  }, [graduationYear])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-6 py-6">
        <h2 className="text-base font-bold tracking-tight text-slate-900">
          Seperti apa karir anda sekarang? <span className="text-rose-500">*</span>
        </h2>
        {errors.career && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.career}</p>}

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

        {/* Follow-up questions depend on the chosen status */}
        {career === 'working' && (
          <div className="mt-6 animate-fade-in-up space-y-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
            <h3 className="text-sm font-bold text-slate-800">Detail Pekerjaan</h3>
            <div>
              <Label label="Nama Perusahaan" htmlFor="reg-company" required />
              <input
                type="text"
                id="reg-company"
                value={details.companyName}
                onChange={(e) => setDetails({ companyName: e.target.value })}
                placeholder="Contoh: PT Maju Bersama"
                className={clsx(
                  'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
                  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                  errors.companyName ? 'border-rose-400' : 'border-slate-300',
                )}
              />
              <FieldError message={errors.companyName} />
            </div>
            <div>
              <Label label="Posisi / Jabatan" htmlFor="reg-position" required />
              <input
                type="text"
                id="reg-position"
                value={details.position}
                onChange={(e) => setDetails({ position: e.target.value })}
                placeholder="Contoh: Software Engineer"
                className={clsx(
                  'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
                  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                  errors.position ? 'border-rose-400' : 'border-slate-300',
                )}
              />
              <FieldError message={errors.position} />
            </div>
            <div>
              <Label label="Bidang Usaha / Industri" htmlFor="reg-business-field" required />
              <input
                type="text"
                id="reg-business-field"
                value={details.businessField}
                onChange={(e) => setDetails({ businessField: e.target.value })}
                placeholder="Contoh: Teknologi Informasi"
                className={clsx(
                  'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
                  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                  errors.businessField ? 'border-rose-400' : 'border-slate-300',
                )}
              />
              <FieldError message={errors.businessField} />
            </div>
            <div>
              <Label label="Tahun Mulai Bekerja" htmlFor="reg-work-start" required />
              <div className="relative mt-2">
                <select
                  id="reg-work-start"
                  value={details.businessStartYear}
                  onChange={(e) => setDetails({ businessStartYear: e.target.value })}
                  className={clsx(
                    'w-full appearance-none rounded-lg border bg-white py-2.5 pr-9 pl-3 text-sm text-slate-900',
                    'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                    errors.businessStartYear ? 'border-rose-400' : 'border-slate-300',
                  )}
                >
                  <option value="">Pilih tahun mulai</option>
                  {workYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
              </div>
              <FieldError message={errors.businessStartYear} />
            </div>
            <div>
              <Label label="Provinsi Kerja" htmlFor="reg-work-province" required />
              <div className="relative mt-2">
                <select
                  id="reg-work-province"
                  value={workProvinceId}
                  onChange={(e) => {
                    const p = provinces.find((x) => String(x.id) === e.target.value)
                    setWorkProvinceId(e.target.value)
                    setDetails({ workProvince: p?.name ?? '', workCity: '' })
                  }}
                  className={clsx(
                    'w-full appearance-none rounded-lg border bg-white py-2.5 pr-9 pl-3 text-sm text-slate-900',
                    'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                    errors.workProvince ? 'border-rose-400' : 'border-slate-300',
                  )}
                >
                  <option value="">Pilih provinsi</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
              </div>
              <RegionHint
                isLoading={provincesQuery.isLoading}
                isError={provincesQuery.isError}
                onRetry={() => provincesQuery.refetch()}
              />
              <FieldError message={errors.workProvince} />
            </div>
            <div>
              <Label label="Kota Kerja" htmlFor="reg-work-city" required />
              <div className="relative mt-2">
                <select
                  id="reg-work-city"
                  value={workCityId}
                  disabled={!workProvinceId}
                  onChange={(e) => {
                    const r = workRegencies.find((x) => String(x.id) === e.target.value)
                    setDetails({ workCity: r?.name ?? '' })
                  }}
                  className={clsx(
                    'w-full appearance-none rounded-lg border bg-white py-2.5 pr-9 pl-3 text-sm text-slate-900',
                    'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                    errors.workCity ? 'border-rose-400' : 'border-slate-300',
                    !workProvinceId && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <option value="">{workProvinceId ? 'Pilih kota' : 'Pilih provinsi dahulu'}</option>
                  {workRegencies.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
              </div>
              <FieldError message={errors.workCity} />
            </div>
          </div>
        )}

        {career === 'continuing_study' && (
          <div className="mt-6 animate-fade-in-up space-y-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
            <h3 className="text-sm font-bold text-slate-800">Detail Pendidikan Lanjutan</h3>
            <div>
              <Label label="Kuliah di mana?" htmlFor="reg-study-inst" required />
              <UniversitySelect
                universities={universities}
                value={details.studyInstitution}
                onChange={(name) => setDetails({ studyInstitution: name, studyProgram: '' })}
                onSearch={setUniversitySearch}
                invalid={Boolean(errors.studyInstitution)}
              />
              {universitiesQuery.isPending && (
                <p className="mt-1.5 text-xs text-slate-400 italic">Memuat daftar universitas…</p>
              )}
              <FieldError message={errors.studyInstitution} />
            </div>
            <div>
              <Label label="Jurusan / Prodi" htmlFor="reg-study-prog" required />
              <div className="relative mt-2">
                <select
                  id="reg-study-prog"
                  value={details.studyProgram}
                  disabled={!selectedUniversityId}
                  onChange={(e) => setDetails({ studyProgram: e.target.value })}
                  className={clsx(
                    'w-full appearance-none rounded-lg border bg-white py-2.5 pr-9 pl-3 text-sm text-slate-900',
                    'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                    errors.studyProgram ? 'border-rose-400' : 'border-slate-300',
                    !selectedUniversityId && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <option value="">
                    {!selectedUniversityId
                      ? 'Pilih universitas dahulu'
                      : studyProgramsQuery.isPending
                        ? 'Memuat prodi…'
                        : 'Pilih program studi'}
                  </option>
                  {studyPrograms.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
              </div>
              <FieldError message={errors.studyProgram} />
            </div>
            <div>
              <Label label="Kapan masuk kuliah?" htmlFor="reg-study-year" required />
              <div className="relative mt-2">
                <select
                  id="reg-study-year"
                  value={details.studyEntryYear}
                  onChange={(e) => setDetails({ studyEntryYear: e.target.value })}
                  className={clsx(
                    'w-full appearance-none rounded-lg border bg-white py-2.5 pr-9 pl-3 text-sm text-slate-900',
                    'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                    errors.studyEntryYear ? 'border-rose-400' : 'border-slate-300',
                  )}
                >
                  <option value="">
                    {graduationYear
                      ? `Pilih tahun masuk (minimal ${Number(graduationYear) + 3})`
                      : 'Pilih tahun masuk kuliah'}
                  </option>
                  {studyYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
              </div>
              <FieldError message={errors.studyEntryYear} />
            </div>
          </div>
        )}

        {career === 'entrepreneur' && (
          <div className="mt-6 animate-fade-in-up space-y-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
            <h3 className="text-sm font-bold text-slate-800">Detail Usaha</h3>
            <div>
              <Label label="Nama Usaha" htmlFor="reg-business" required />
              <input
                type="text"
                id="reg-business"
                value={details.businessName}
                onChange={(e) => setDetails({ businessName: e.target.value })}
                placeholder="Contoh: Kedai Kopi Sukses"
                className={clsx(
                  'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
                  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                  errors.businessName ? 'border-rose-400' : 'border-slate-300',
                )}
              />
              <FieldError message={errors.businessName} />
            </div>
            <div>
              <Label label="Bidang Usaha" htmlFor="reg-biz-field" required />
              <input
                type="text"
                id="reg-biz-field"
                value={details.businessField}
                onChange={(e) => setDetails({ businessField: e.target.value })}
                placeholder="Contoh: Kuliner"
                className={clsx(
                  'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
                  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                  errors.businessField ? 'border-rose-400' : 'border-slate-300',
                )}
              />
              <FieldError message={errors.businessField} />
            </div>
            <div>
              <Label label="Tahun Mulai Usaha" htmlFor="reg-biz-start" required />
              <div className="relative mt-2">
                <select
                  id="reg-biz-start"
                  value={details.businessStartYear}
                  onChange={(e) => setDetails({ businessStartYear: e.target.value })}
                  className={clsx(
                    'w-full appearance-none rounded-lg border bg-white py-2.5 pr-9 pl-3 text-sm text-slate-900',
                    'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                    errors.businessStartYear ? 'border-rose-400' : 'border-slate-300',
                  )}
                >
                  <option value="">Pilih tahun mulai</option>
                  {workYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
              </div>
              <FieldError message={errors.businessStartYear} />
            </div>
            <div>
              <Label label="Provinsi Usaha" htmlFor="reg-biz-province" required />
              <div className="relative mt-2">
                <select
                  id="reg-biz-province"
                  value={bizProvinceId}
                  onChange={(e) => {
                    const p = provinces.find((x) => String(x.id) === e.target.value)
                    setBizProvinceId(e.target.value)
                    setDetails({ businessProvince: p?.name ?? '', businessCity: '' })
                  }}
                  className={clsx(
                    'w-full appearance-none rounded-lg border bg-white py-2.5 pr-9 pl-3 text-sm text-slate-900',
                    'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                    errors.businessProvince ? 'border-rose-400' : 'border-slate-300',
                  )}
                >
                  <option value="">Pilih provinsi</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
              </div>
              <FieldError message={errors.businessProvince} />
            </div>
            <div>
              <Label label="Kota Usaha" htmlFor="reg-biz-city" required />
              <div className="relative mt-2">
                <select
                  id="reg-biz-city"
                  value={bizCityId}
                  disabled={!bizProvinceId}
                  onChange={(e) => {
                    const r = bizRegencies.find((x) => String(x.id) === e.target.value)
                    setDetails({ businessCity: r?.name ?? '' })
                  }}
                  className={clsx(
                    'w-full appearance-none rounded-lg border bg-white py-2.5 pr-9 pl-3 text-sm text-slate-900',
                    'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                    errors.businessCity ? 'border-rose-400' : 'border-slate-300',
                    !bizProvinceId && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <option value="">{bizProvinceId ? 'Pilih kota' : 'Pilih provinsi dahulu'}</option>
                  {bizRegencies.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
              </div>
              <FieldError message={errors.businessCity} />
            </div>
            <div>
              <Label label="Alamat Usaha" htmlFor="reg-business-address" required />
              <input
                type="text"
                id="reg-business-address"
                value={details.businessAddress}
                onChange={(e) => setDetails({ businessAddress: e.target.value })}
                placeholder="Contoh: Jl. Raya No. 45, Jakarta Selatan"
                className={clsx(
                  'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
                  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none',
                  errors.businessAddress ? 'border-rose-400' : 'border-slate-300',
                )}
              />
              <FieldError message={errors.businessAddress} />
            </div>
          </div>
        )}

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
/* OTP verification screen                                             */
/* ------------------------------------------------------------------ */

function OtpStep({
  email,
  onVerified,
  onBack,
}: {
  email: string
  onVerified: (data: LoginResponse) => void
  onBack: () => void
}) {
  const verify = useVerifyOtp()
  const resend = useResendOtp()
  const toast = useToast()
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const data = await verify.mutateAsync({ email, otp })
      onVerified(data)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const onResend = async () => {
    setError(null)
    try {
      await resend.mutateAsync({ email, purpose: 'register' })
      toast('Kode OTP baru telah dikirim ke email Anda')
    } catch {
      toast('Gagal mengirim ulang OTP', 'error')
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader icon={<ShieldCheck className="size-5" />} title="Verifikasi Email" step={4} />
      <div className="space-y-5 px-6 py-6">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-slate-600">
          Kami telah mengirim kode OTP 6 digit ke <span className="font-semibold text-slate-800">{email}</span>.
          Masukkan kode tersebut untuk mengaktifkan akun Anda.
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label label="Kode OTP" htmlFor="reg-otp" required />
            <input
              type="text"
              id="reg-otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-center font-mono text-2xl tracking-[0.5em] text-slate-900 placeholder:text-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
            />
          </div>

          {error && <FieldError message={error} />}

          <Button type="submit" size="lg" className="w-full" loading={verify.isPending}>
            <ShieldCheck className="size-4" /> Verifikasi Akun
          </Button>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={onResend}
            disabled={resend.isPending}
            className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500 disabled:opacity-50"
          >
            {resend.isPending ? 'Mengirim…' : 'Kirim ulang kode'}
          </button>
          <button type="button" onClick={onBack} className="font-semibold text-slate-500 transition-colors hover:text-slate-700">
            Ganti email
          </button>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

const REGISTER_DRAFT_KEY = 'tracerconnect-register-draft'

interface RegisterDraft {
  step: number
  email: string
  institutionId: string
  provinceId: string
  provinceName: string
  regencyId: string
  regencyName: string
  districtId: string
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
  career: string | null
  careerDetails: CareerDetails
}

function readRegisterDraft(): RegisterDraft | null {
  try {
    return JSON.parse(localStorage.getItem(REGISTER_DRAFT_KEY) ?? 'null') as RegisterDraft | null
  } catch {
    return null
  }
}export function Register() {
  const navigate = useNavigate()
  const toast = useToast()
  const register = useRegister()
  const completeGoogle = useCompleteGoogleRegistration()
  const uploadAvatar = useUploadAvatar()
  const institutionsQuery = useInstitutionOptions()
  const [searchParams] = useSearchParams()
  const isGoogle = searchParams.get('google') === '1'

  // New Google users arrive via navigation state (email, name, registration_token).
  // Existing Google users come from the session.
  const location = useLocation()
  const googleState = isGoogle ? (location.state as { email?: string; name?: string; registration_token?: string } | null) : null
  const googleUser = isGoogle ? (googleState ?? (getUser() ? { name: getUser()!.name, email: getUser()!.email } : null)) : null

  const [draft] = useState<RegisterDraft | null>(readRegisterDraft)

  const [step, setStep] = useState(draft?.step ?? 1)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [provinceId, setProvinceId] = useState(draft?.provinceId ?? '')
  const [provinceName, setProvinceName] = useState(draft?.provinceName ?? '')
  const [regencyId, setRegencyId] = useState(draft?.regencyId ?? '')
  const [regencyName, setRegencyName] = useState(draft?.regencyName ?? '')
  const [districtId, setDistrictId] = useState(draft?.districtId ?? '')

  const provincesQuery = useProvinces()
  const regenciesQuery = useRegencies(provinceId || null)
  const districtsQuery = useDistricts(regencyId || null)

  const [email, setEmail] = useState(draft?.email ?? googleUser?.email ?? '')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [institutionId, setInstitutionId] = useState(draft?.institutionId ?? '')
  const [pendingOtp, setPendingOtp] = useState<{ email: string } | null>(null)

  // Single-school deployment: when the platform only has one active school,
  // always pin it so alumni never have to pick (1-tenant mode). Overriding
  // unconditionally also repairs drafts that kept a stale/old school id,
  // which otherwise left the Jurusan dropdown empty.
  const singleInstitution = (institutionsQuery.data ?? []).length === 1
  useEffect(() => {
    const list = institutionsQuery.data ?? []
    if (singleInstitution && list[0] && institutionId !== list[0].id) {
      setInstitutionId(list[0].id)
    }
  }, [institutionsQuery.data, singleInstitution, institutionId])

  const departmentsQuery = useDepartmentOptions(institutionId || null)

  const [form, setForm] = useState(draft?.form ?? {
    name: googleUser?.name ?? '',
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


  const [career, setCareer] = useState<string | null>(draft?.career ?? null)
  const [careerDetails, setCareerDetails] = useState<CareerDetails>(draft?.careerDetails ?? {
    companyName: '',
    position: '',
    businessField: '',
    businessStartYear: '',
    workProvince: '',
    workCity: '',
    studyInstitution: '',
    studyProgram: '',
    studyEntryYear: '',
    businessName: '',
    businessAddress: '',
    businessProvince: '',
    businessCity: '',
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    try {
      const payload: RegisterDraft = {
        step,
        email,
        institutionId,
        provinceId,
        provinceName,
        regencyId,
        regencyName,
        districtId,
        form,
        career,
        careerDetails,
      }
      localStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(payload))
    } catch {
    }
  }, [step, email, institutionId, provinceId, provinceName, regencyId, regencyName, districtId, form, career, careerDetails])

  const clearDraft = () => localStorage.removeItem(REGISTER_DRAFT_KEY)

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

    // Google mode: step 1 = biodata (institution + personal info), step 2 = career
    if (isGoogle) {
      if (target === 1) {
        if (!institutionId) next.institution = 'Pilih institusi Anda'
        if (!form.name.trim()) next.name = 'Nama lengkap wajib diisi'
        if (!form.department) next.department = 'Pilih jurusan'
        if (!form.gender) next.gender = 'Pilih jenis kelamin'
        if (!form.phone.trim()) next.phone = 'No HP wajib diisi'
        else if (!/^(08|\+62)/.test(form.phone.trim())) next.phone = 'No HP harus diawali 08 atau +62'
        else if (form.phone.trim().length < 10) next.phone = 'No HP minimal 10 karakter'
        if (!form.nis.trim()) next.nis = 'NIS wajib diisi'
        else if (form.nis.trim().length !== 10) next.nis = 'NIS harus tepat 10 karakter'
        if (!form.nisn.trim()) next.nisn = 'NISN wajib diisi'
        else if (form.nisn.trim().length !== 10) next.nisn = 'NISN harus tepat 10 karakter'
        if (!form.yearIn) next.yearIn = 'Pilih tahun masuk'
        if (!form.yearOut) next.yearOut = 'Pilih tahun lulus'
        if (form.yearIn && form.yearOut && Number(form.yearOut) - Number(form.yearIn) < 3) {
          next.yearOut = 'Tahun lulus minimal 3 tahun setelah tahun masuk'
        }
        if (!provinceId) next.province = 'Pilih provinsi'
        if (!regencyId) next.birthplace = 'Pilih kabupaten/kota'
        if (!districtId) next.district = 'Pilih kecamatan'
        if (!form.birthDate) next.birthDate = 'Pilih tanggal lahir'
        if (!form.address.trim()) next.address = 'Alamat wajib diisi'
      }
      if (target === 2) {
        if (!career) next.career = 'Pilih salah satu status karir'
        if (career === 'working') {
          if (!careerDetails.companyName.trim()) next.companyName = 'Nama perusahaan wajib diisi'
          if (!careerDetails.position.trim()) next.position = 'Posisi wajib diisi'
          if (!careerDetails.businessField.trim()) next.businessField = 'Bidang usaha wajib diisi'
          if (!careerDetails.businessStartYear) next.businessStartYear = 'Pilih tahun mulai'
          if (!careerDetails.workProvince.trim()) next.workProvince = 'Pilih provinsi kerja'
          if (!careerDetails.workCity.trim()) next.workCity = 'Pilih kota kerja'
        }
        if (career === 'continuing_study') {
          if (!careerDetails.studyInstitution.trim()) next.studyInstitution = 'Pilih tempat kuliah'
          if (!careerDetails.studyProgram.trim()) next.studyProgram = 'Pilih program studi'
          if (!careerDetails.studyEntryYear) next.studyEntryYear = 'Pilih tahun masuk kuliah'
          else if (
            form.yearOut &&
            Number(careerDetails.studyEntryYear) < Number(form.yearOut) + 3
          ) {
            next.studyEntryYear = 'Tahun masuk kuliah minimal 3 tahun setelah tahun lulus'
          }
        }
        if (career === 'entrepreneur') {
          if (!careerDetails.businessName.trim()) next.businessName = 'Nama usaha wajib diisi'
          if (!careerDetails.businessField.trim()) next.businessField = 'Bidang usaha wajib diisi'
          if (!careerDetails.businessStartYear) next.businessStartYear = 'Pilih tahun mulai'
          if (!careerDetails.businessAddress.trim()) next.businessAddress = 'Alamat usaha wajib diisi'
          if (!careerDetails.businessProvince.trim()) next.businessProvince = 'Pilih provinsi usaha'
          if (!careerDetails.businessCity.trim()) next.businessCity = 'Pilih kota usaha'
        }
      }
    } else {
      // Regular mode
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
        else if (!/^(08|\+62)/.test(form.phone.trim())) next.phone = 'No HP harus diawali 08 atau +62'
        else if (form.phone.trim().length < 10) next.phone = 'No HP minimal 10 karakter'
        if (!form.nis.trim()) next.nis = 'NIS wajib diisi'
        else if (form.nis.trim().length !== 10) next.nis = 'NIS harus tepat 10 karakter'
        if (!form.nisn.trim()) next.nisn = 'NISN wajib diisi'
        else if (form.nisn.trim().length !== 10) next.nisn = 'NISN harus tepat 10 karakter'
        if (!form.yearIn) next.yearIn = 'Pilih tahun masuk'
        if (!form.yearOut) next.yearOut = 'Pilih tahun lulus'
        if (form.yearIn && form.yearOut && Number(form.yearOut) - Number(form.yearIn) < 3) {
          next.yearOut = 'Tahun lulus minimal 3 tahun setelah tahun masuk'
        }
        if (!provinceId) next.province = 'Pilih provinsi'
        if (!regencyId) next.birthplace = 'Pilih kabupaten/kota'
        if (!districtId) next.district = 'Pilih kecamatan'
        if (!form.birthDate) next.birthDate = 'Pilih tanggal lahir'
        if (!form.address.trim()) next.address = 'Alamat wajib diisi'
      }

      if (target === 3) {
        if (!career) next.career = 'Pilih salah satu status karir'
        if (career === 'working') {
          if (!careerDetails.companyName.trim()) next.companyName = 'Nama perusahaan wajib diisi'
          if (!careerDetails.position.trim()) next.position = 'Posisi wajib diisi'
          if (!careerDetails.businessField.trim()) next.businessField = 'Bidang usaha wajib diisi'
          if (!careerDetails.businessStartYear) next.businessStartYear = 'Pilih tahun mulai'
          if (!careerDetails.workProvince.trim()) next.workProvince = 'Pilih provinsi kerja'
          if (!careerDetails.workCity.trim()) next.workCity = 'Pilih kota kerja'
        }
        if (career === 'continuing_study') {
          if (!careerDetails.studyInstitution.trim()) next.studyInstitution = 'Pilih tempat kuliah'
          if (!careerDetails.studyProgram.trim()) next.studyProgram = 'Pilih program studi'
          if (!careerDetails.studyEntryYear) next.studyEntryYear = 'Pilih tahun masuk kuliah'
          else if (
            form.yearOut &&
            Number(careerDetails.studyEntryYear) < Number(form.yearOut) + 3
          ) {
            next.studyEntryYear = 'Tahun masuk kuliah minimal 3 tahun setelah tahun lulus'
          }
        }
        if (career === 'entrepreneur') {
          if (!careerDetails.businessName.trim()) next.businessName = 'Nama usaha wajib diisi'
          if (!careerDetails.businessField.trim()) next.businessField = 'Bidang usaha wajib diisi'
          if (!careerDetails.businessStartYear) next.businessStartYear = 'Pilih tahun mulai'
          if (!careerDetails.businessAddress.trim()) next.businessAddress = 'Alamat usaha wajib diisi'
          if (!careerDetails.businessProvince.trim()) next.businessProvince = 'Pilih provinsi usaha'
          if (!careerDetails.businessCity.trim()) next.businessCity = 'Pilih kota usaha'
        }
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const goNext = () => {
    setError(null)
    if (!validateStep(step)) return
    setStep((s) => Math.min(s + 1, maxStep))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setError(null)
    setStep((s) => Math.max(s - 1, 1))
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step < maxStep) {
      goNext()
    } else {
      onSubmitForm()
    }
  }

  const onSubmitForm = async () => {
    setError(null)

    // Google mode: skip account validation, submit biodata to complete registration.
    if (isGoogle) {
      if (!institutionId) {
        setErrors({ institution: 'Pilih institusi Anda' })
        return
      }
      setSubmitting(true)
      try {
        const data = await completeGoogle.mutateAsync({
          name: form.name || undefined,
          institution_id: institutionId,
          registration_token: googleState?.registration_token,
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
          company_name: career === 'working' ? careerDetails.companyName.trim() || undefined : undefined,
          position: career === 'working' ? careerDetails.position.trim() || undefined : undefined,
          business_field: career === 'working' || career === 'entrepreneur'
            ? careerDetails.businessField.trim() || undefined
            : undefined,
          business_start_year: career === 'working' || career === 'entrepreneur'
            ? (careerDetails.businessStartYear ? Number(careerDetails.businessStartYear) : undefined)
            : undefined,
          work_province: career === 'working' ? careerDetails.workProvince.trim() || undefined : undefined,
          work_city: career === 'working' ? careerDetails.workCity.trim() || undefined : undefined,
          study_institution: career === 'continuing_study' ? careerDetails.studyInstitution.trim() || undefined : undefined,
          study_program: career === 'continuing_study' ? careerDetails.studyProgram.trim() || undefined : undefined,
          study_entry_year: career === 'continuing_study' && careerDetails.studyEntryYear
            ? Number(careerDetails.studyEntryYear)
            : undefined,
          business_name: career === 'entrepreneur' ? careerDetails.businessName.trim() || undefined : undefined,
          business_address: career === 'entrepreneur' ? careerDetails.businessAddress.trim() || undefined : undefined,
          business_province: career === 'entrepreneur' ? careerDetails.businessProvince.trim() || undefined : undefined,
          business_city: career === 'entrepreneur' ? careerDetails.businessCity.trim() || undefined : undefined,
        })

        clearDraft()
        setPendingOtp({ email: data.email })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch (err) {
        setError(apiError(err))
      } finally {
        setSubmitting(false)
      }
      return
    }

    // Regular mode: validate account step first.
    if (!validateStep(1)) return

    if (password.length < 8 || confirmation !== password) {
      setStep(1)
      setError('Password tidak tersimpan saat refresh — masukkan kembali password Anda.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

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
        company_name: career === 'working' ? careerDetails.companyName.trim() || undefined : undefined,
        position: career === 'working' ? careerDetails.position.trim() || undefined : undefined,
        business_field: career === 'working' || career === 'entrepreneur'
          ? careerDetails.businessField.trim() || undefined
          : undefined,
        business_start_year: career === 'working' || career === 'entrepreneur'
          ? (careerDetails.businessStartYear ? Number(careerDetails.businessStartYear) : undefined)
          : undefined,
        work_province: career === 'working' ? careerDetails.workProvince.trim() || undefined : undefined,
        work_city: career === 'working' ? careerDetails.workCity.trim() || undefined : undefined,
        study_institution: career === 'continuing_study' ? careerDetails.studyInstitution.trim() || undefined : undefined,
        study_program: career === 'continuing_study' ? careerDetails.studyProgram.trim() || undefined : undefined,
        study_entry_year: career === 'continuing_study' && careerDetails.studyEntryYear
          ? Number(careerDetails.studyEntryYear)
          : undefined,
        business_name: career === 'entrepreneur' ? careerDetails.businessName.trim() || undefined : undefined,
        business_address: career === 'entrepreneur' ? careerDetails.businessAddress.trim() || undefined : undefined,
        business_province: career === 'entrepreneur' ? careerDetails.businessProvince.trim() || undefined : undefined,
        business_city: career === 'entrepreneur' ? careerDetails.businessCity.trim() || undefined : undefined,
      })

      // Registration now requires email verification via OTP — show the OTP
      // screen instead of logging straight in.
      clearDraft()
      setPendingOtp({ email: data.email })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleOtpVerified = async (data: LoginResponse) => {
    clearDraft()
    setSession(data.token, data.user)

    // Upload the chosen profile photo right after verification succeeds.
    if (photoFile) {
      try {
        await uploadAvatar.mutateAsync(photoFile)
      } catch {
        // Non-fatal: account was created; photo can be set later from Profile.
        toast('Akun dibuat, tetapi foto gagal diunggah', 'error')
      }
    }

    // For Google users who just completed registration, show a success message.
    if (isGoogle) {
      toast('Registrasi berhasil! Akun Anda telah aktif.')
    }

    navigate(hasAdminRole(data.user) ? '/dashboard' : '/home', { replace: true })
  }

  const institutions = institutionsQuery.data ?? []

  // 1-tenant mode: no institution step, so drop "& Institusi" from the label.
  const stepLabels = isGoogle
    ? singleInstitution
      ? ['Biodata', 'Status Karir', 'Verifikasi']
      : GOOGLE_STEP_LABELS
    : STEP_LABELS
  const maxStep = isGoogle ? 2 : 3

  return (
    <AuthLayout wide>
      {/* Lag loading overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/85 backdrop-blur-sm">
          <LagLoader label="Lagi nge-lag nih, nyambungin…" />
        </div>
      )}
      <StepHeader step={step} labels={stepLabels} />

      <div className="mt-8">
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 px-5 py-4">
          <p className="text-sm font-semibold text-indigo-800">
            {isGoogle ? 'Lengkapi biodata Anda' : 'Daftar gratis sebagai alumni'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {isGoogle
              ? 'Lengkapi data diri Anda untuk terhubung dengan sesama alumni dan mengikuti tracer study institusi Anda.'
              : 'Lengkapi data diri Anda dalam 3 langkah untuk terhubung dengan sesama alumni dan\n            mengikuti tracer study institusi Anda.'}
          </p>
        </div>
      </div>

      {pendingOtp ? (
        <div className="mt-8">
          <OtpStep
            email={pendingOtp.email}
            onVerified={handleOtpVerified}
            onBack={() => setPendingOtp(null)}
          />
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Sudah punya akun?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500">
                Masuk sekarang
              </Link>
            </p>
          </div>
        </div>
      ) : (
      <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          {error && (
            <div className="animate-fade-in-up rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Step content re-animates whenever the step changes */}
          <div key={step} className="animate-fade-in-up">
          {/* Regular mode: 3 steps (Account, Info, Career) */}
          {!isGoogle && step === 1 && (
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

          {!isGoogle && step === 2 && (
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
              regionStatus={{
                provinces: { isLoading: provincesQuery.isLoading, isError: provincesQuery.isError },
                regencies: { isLoading: regenciesQuery.isLoading, isError: regenciesQuery.isError },
                districts: { isLoading: districtsQuery.isLoading, isError: districtsQuery.isError },
              }}
              onRegionRetry={(key) => {
                if (key === 'provinces') provincesQuery.refetch()
                else if (key === 'regencies') regenciesQuery.refetch()
                else districtsQuery.refetch()
              }}
              departments={departmentsQuery.data ?? []}
              departmentsLoading={departmentsQuery.isLoading}
              institutionId={institutionId}
              onDepartmentRetry={() => departmentsQuery.refetch()}
            />
          )}

          {!isGoogle && step === 3 && (
            <CareerStep
              career={career}
              setCareer={setCareer}
              details={careerDetails}
              setDetails={(patch) => setCareerDetails((d) => ({ ...d, ...patch }))}
              errors={errors}
              graduationYear={form.yearOut}
            />
          )}

          {/* Google mode: 2 steps (Info+Institution, Career) */}
          {/* 1-tenant mode: hide the institution picker entirely when there
              is only one active school — it is attached server-side. */}
          {isGoogle && step === 1 && !singleInstitution && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <CardHeader icon={<Building2 className="size-5" />} title="Institusi & Biodata" step={1} />
              <div className="space-y-5 px-6 py-6">
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
                      {institutions.length === 0 && (
                        <option value="">Memuat daftar institusi…</option>
                      )}
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
              </div>
            </section>
          )}

          {isGoogle && step === 1 && (
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
              regionStatus={{
                provinces: { isLoading: provincesQuery.isLoading, isError: provincesQuery.isError },
                regencies: { isLoading: regenciesQuery.isLoading, isError: regenciesQuery.isError },
                districts: { isLoading: districtsQuery.isLoading, isError: districtsQuery.isError },
              }}
              onRegionRetry={(key) => {
                if (key === 'provinces') provincesQuery.refetch()
                else if (key === 'regencies') regenciesQuery.refetch()
                else districtsQuery.refetch()
              }}
              departments={departmentsQuery.data ?? []}
              departmentsLoading={departmentsQuery.isLoading}
              institutionId={institutionId}
              onDepartmentRetry={() => departmentsQuery.refetch()}
            />
          )}

          {isGoogle && step === 2 && (
            <CareerStep
              career={career}
              setCareer={setCareer}
              details={careerDetails}
              setDetails={(patch) => setCareerDetails((d) => ({ ...d, ...patch }))}
              errors={errors}
              graduationYear={form.yearOut}
            />
          )}
          </div>

          {/* Navigation */}
          <div className="flex animate-fade-in-up items-center justify-between" style={{ animationDelay: '120ms' }}>
            <Button variant="secondary" type="button" onClick={goBack} disabled={step === 1 || submitting} className="border-slate-300">
              <ArrowLeft className="size-4" /> Kembali
            </Button>
            {step < maxStep ? (
              <Button type="submit" className="text-[15px]">
                Lanjut <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="submit" loading={submitting} className="text-[15px]">
                <PencilLine className="size-4" /> {isGoogle ? 'Simpan & Verifikasi' : 'Daftar Sekarang'}
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-slate-400">
            Dengan mendaftar, Anda menyetujui{' '}
            <a href="#syarat" className="underline hover:text-slate-600">Syarat &amp; Ketentuan</a> dan{' '}
            <a href="#privasi" className="underline hover:text-slate-600">Kebijakan Privasi</a> TracerAlumni.
          </p>

          <p className="text-center text-sm text-slate-500">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500">
              Masuk sekarang
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
