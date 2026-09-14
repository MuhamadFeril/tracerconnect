import { useEffect } from 'react'
import { ArrowLeft, Download, Printer, User, Mail, Phone, MapPin, GraduationCap, BriefcaseBusiness, Heart, Wrench, FileText } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { CvFormData } from '../../lib/types'
import { getUser } from '../../lib/auth'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

interface LocationState {
  cvData?: CvFormData
  coverLetter?: string | null
  alumniName?: string
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase">{label}</p>
        <p className="text-sm text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Wrench; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 border-b border-slate-200 pb-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
        <Icon className="size-3.5" /> {title}
      </h3>
      {children}
    </div>
  )
}

function CvContent({ cv, coverLetter, alumniName }: { cv: CvFormData | null; coverLetter?: string | null; alumniName?: string }) {
  const fullName = cv?.full_name || alumniName || '-'
  const department = cv?.department || null
  const gradYear = cv?.graduation_year || null
  const headerSub = [department, gradYear ? `'${String(gradYear).slice(2)}` : ''].filter(Boolean).join(' ')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-5 border-b-2 border-indigo-600 pb-5">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">
          {fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{fullName}</h1>
          {headerSub && <p className="mt-0.5 text-sm text-slate-500">{headerSub}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {cv?.email && <span className="flex items-center gap-1"><Mail className="size-3" /> {cv.email}</span>}
            {cv?.phone && <span className="flex items-center gap-1"><Phone className="size-3" /> {cv.phone}</span>}
            {cv?.address && <span className="flex items-center gap-1"><MapPin className="size-3" /> {cv.address}</span>}
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left — main content */}
        <div className="space-y-5 md:col-span-2">
          <Section title="Data Pribadi" icon={User}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              <InfoRow icon={User} label="Jenis Kelamin" value={cv?.gender === 'male' ? 'Laki-laki' : cv?.gender === 'female' ? 'Perempuan' : null} />
              <InfoRow icon={MapPin} label="Tempat Lahir" value={cv?.birthplace} />
              <InfoRow icon={MapPin} label="Tanggal Lahir" value={cv?.birth_date} />
              <InfoRow icon={GraduationCap} label="Jurusan" value={cv?.department} />
              <InfoRow icon={GraduationCap} label="Tahun Lulus" value={cv?.graduation_year} />
              <InfoRow icon={GraduationCap} label="Pendidikan" value={cv?.education} />
            </div>
          </Section>

          {cv?.experience && (
            <Section title="Pengalaman Kerja" icon={BriefcaseBusiness}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{cv.experience}</p>
            </Section>
          )}

          {coverLetter && (
            <Section title="Surat Lamaran" icon={FileText}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{coverLetter}</p>
            </Section>
          )}

          {cv?.interests && (
            <Section title="Minat & Bidang" icon={Heart}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{cv.interests}</p>
            </Section>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {cv?.skills && cv.skills.length > 0 && (
            <Section title="Keahlian" icon={Wrench}>
              <div className="flex flex-wrap gap-1.5">
                {cv.skills.map((s) => (
                  <span key={s} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{s}</span>
                ))}
              </div>
            </Section>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Ringkasan</p>
            <ul className="mt-2 space-y-1">
              {cv?.full_name && <li>Nama: {cv.full_name}</li>}
              {cv?.email && <li>Email: {cv.email}</li>}
              {cv?.phone && <li>HP: {cv.phone}</li>}
              {cv?.department && <li>Jurusan: {cv.department}</li>}
              {cv?.graduation_year && <li>Lulus: {cv.graduation_year}</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CvPreviewPage() {
  const location = useLocation()
  const state = (location.state ?? {}) as LocationState

  const cv = state.cvData ?? null
  const coverLetter = state.coverLetter ?? null
  const alumniName = state.alumniName ?? undefined

  // Fallback: if opened directly (no state), try to get user info
  const user = getUser()
  const fallbackCv: CvFormData = {
    full_name: user?.alumni?.name ?? user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.alumni?.phone ?? user?.phone ?? '',
    gender: user?.alumni?.gender ?? user?.gender ?? null,
    birth_date: user?.alumni?.birth_date ?? user?.birth_date ?? null,
    birthplace: user?.alumni?.birthplace_label ?? user?.alumni?.birthplace ?? user?.birthplace ?? null,
    address: user?.alumni?.address ?? user?.address ?? null,
    department: user?.alumni?.department ?? null,
    graduation_year: user?.alumni?.graduation_year != null ? String(user.alumni.graduation_year) : null,
    education: null,
    skills: user?.alumni?.skills ?? null,
    experience: null,
    interests: null,
  }

  const finalCv = cv ?? fallbackCv
  const finalName = alumniName ?? finalCv.full_name ?? user?.name

  useEffect(() => {
    document.title = `CV - ${finalName || 'Preview'}`
  }, [finalName])

  const handlePrint = () => window.print()

  return (
    <div className="space-y-5 print:space-y-0">
      {/* Toolbar - hidden on print */}
      <div className="no-print">
        <PageHeader
          title="Preview CV"
          subtitle={finalName ? `CV ${finalName}` : 'Preview data CV'}
          actions={
            <div className="flex items-center gap-2">
              <Link
                to={-1 as unknown as string}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
              >
                <ArrowLeft className="size-4" /> Kembali
              </Link>
              <Button variant="secondary" onClick={handlePrint}>
                <Printer className="size-4" /> Cetak
              </Button>
              <Button onClick={handlePrint}>
                <Download className="size-4" /> Download PDF
              </Button>
            </div>
          }
        />
      </div>

      {/* CV Content - printable */}
      <Card className="cv-printable mx-auto max-w-3xl overflow-hidden p-6 print:border-0 print:p-0 print:shadow-none sm:p-8">
        <CvContent cv={finalCv} coverLetter={coverLetter} alumniName={alumniName} />
      </Card>

      {/* Print styles */}
      <style>{`
        @media print {
          aside, header, .no-print { display: none !important; }
          .lg\\:pl-60 { padding-left: 0 !important; }
          main { padding: 0 !important; max-width: none !important; margin: 0 !important; }
          .cv-printable {
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  )
}
