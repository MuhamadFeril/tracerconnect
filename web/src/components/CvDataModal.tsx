import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  BriefcaseBusiness,
  Eye,
  FileText,
  GraduationCap,
  Heart,
  Mail,
  MapPin,
  Phone,
  User,
  Wrench,
} from 'lucide-react'
import type { CvFormData, JobApplication } from '../lib/types'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'

/**
 * Structured CV payload (personal info, skills, cover letter, attachments)
 * for a job application. Rendered inline inside detail modals; the wrapper
 * CvDataModal opens it as its own dialog.
 */
export function CvDataContent({ app }: { app: JobApplication }) {
  const cv = app.cv_data
  const info = [
    cv?.full_name && { icon: User, label: 'Nama Lengkap', value: cv.full_name },
    cv?.email && { icon: Mail, label: 'Email', value: cv.email },
    cv?.phone && { icon: Phone, label: 'No. HP', value: cv.phone },
    cv?.gender && { icon: User, label: 'Jenis Kelamin', value: cv.gender === 'male' ? 'Laki-laki' : 'Perempuan' },
    cv?.birthplace && { icon: MapPin, label: 'Tempat Lahir', value: cv.birthplace },
    cv?.birth_date && { icon: MapPin, label: 'Tanggal Lahir', value: cv.birth_date },
    cv?.address && { icon: MapPin, label: 'Alamat', value: cv.address },
    cv?.department && { icon: GraduationCap, label: 'Jurusan', value: cv.department },
    cv?.graduation_year && { icon: GraduationCap, label: 'Tahun Lulus', value: cv.graduation_year },
    cv?.education && { icon: GraduationCap, label: 'Pendidikan', value: cv.education },
    cv?.experience && { icon: BriefcaseBusiness, label: 'Pengalaman Kerja', value: cv.experience },
    cv?.interests && { icon: Heart, label: 'Minat', value: cv.interests },
  ].filter(Boolean) as { icon: typeof User; label: string; value: string }[]

  return (
    <div className="space-y-5">
      {/* Current workplace (from the alumni profile) */}
      {(app.alumni?.position || app.alumni?.company_name) && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <h4 className="flex items-center gap-2 text-xs font-bold tracking-wide text-indigo-700 uppercase">
            <Briefcase className="size-3.5" /> Pekerjaan Saat Ini
          </h4>
          <p className="mt-1.5 text-sm font-medium text-slate-800">
            {[app.alumni?.position, app.alumni?.company_name].filter(Boolean).join(' di ')}
          </p>
        </div>
      )}

      {/* Profile Info */}
      {info.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Data Pribadi</h4>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {info.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-400">{label}</p>
                  <p className="text-sm text-slate-800">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {cv?.skills && cv.skills.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
            <Wrench className="size-3.5" /> Keahlian
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cv.skills.map((s) => (
              <span key={s} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Cover Letter */}
      {app.cover_letter && (
        <div>
          <h4 className="text-xs font-bold tracking-wide text-slate-500 uppercase">Surat Lamaran</h4>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{app.cover_letter}</p>
        </div>
      )}

      {/* Files */}
      {(app.cv_path || app.portfolio_path) && (
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
            <FileText className="size-3.5" /> File Lampiran
          </h4>
          <div className="mt-2 space-y-1.5">
            {app.cv_path && (
              <a
                href={`/backend/storage/app/${app.cv_path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
              >
                <FileText className="size-4" /> CV — {app.cv_path.split('/').pop()}
              </a>
            )}
            {app.portfolio_path && (
              <a
                href={`/backend/storage/app/${app.portfolio_path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
              >
                <FileText className="size-4" /> Portofolio — {app.portfolio_path.split('/').pop()}
              </a>
            )}
          </div>
        </div>
      )}

      {!cv && !app.cover_letter && !app.cv_path && !app.portfolio_path && (
        <p className="text-sm text-slate-400 italic">Tidak ada data CV yang dikirim.</p>
      )}
    </div>
  )
}

/** Full-screen CV dialog with a button to open the styled CV preview. */
export function CvDataModal({ app, onClose }: { app: JobApplication | null; onClose: () => void }) {
  const navigate = useNavigate()
  if (!app) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={`CV — ${app.cv_data?.full_name ?? app.alumni?.name ?? 'Pelamar'}`}
      description="Data CV yang dikirim pelamar"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
          <Button
            onClick={() => {
              const a = app.alumni
              const cvFromProfile: CvFormData = app.cv_data ?? {
                full_name: a?.name ?? '',
                email: null,
                phone: null,
                gender: null,
                birth_date: null,
                birthplace: null,
                address: null,
                department: a?.department ?? null,
                graduation_year: a?.graduation_year != null ? String(a.graduation_year) : null,
                education: [a?.department, a?.graduation_year ? `'${String(a.graduation_year).slice(2)}` : ''].filter(Boolean).join(' · '),
                skills: null,
                experience: [a?.position, a?.company_name].filter(Boolean).join(' di ') || null,
                interests: null,
              }
              navigate('/cv-preview', { state: { cvData: cvFromProfile, coverLetter: app.cover_letter, alumniName: a?.name } })
            }}
          >
            <Eye className="size-4" /> Preview CV
          </Button>
        </>
      }
    >
      <CvDataContent app={app} />
    </Modal>
  )
}