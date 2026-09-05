import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react'
import { useHrdAlumniDetail } from '../../hooks/queries'
import { formatDate } from '../../lib/format'
import { Card, CardHeader } from '../../components/ui/Card'
import { LoadingState, ErrorState } from '../../components/ui/StateViews'
import { Badge } from '../../components/ui/Badge'

const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  working: 'Bekerja',
  unemployed: 'Tidak Bekerja',
  entrepreneur: 'Wirausaha',
  continuing_study: 'Melanjutkan Studi',
}

const EMPLOYMENT_STATUS_TONES: Record<string, 'green' | 'amber' | 'sky' | 'slate'> = {
  working: 'green',
  unemployed: 'amber',
  entrepreneur: 'sky',
  continuing_study: 'slate',
}

export function HrdAlumniDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: alumni, isPending, isError, refetch } = useHrdAlumniDetail(id ?? null)

  if (isPending) return <LoadingState label="Memuat profil alumni…" />
  if (isError || !alumni) return <ErrorState message="Gagal memuat data alumni" onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/hrd/alumni" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{alumni.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {alumni.department && `${alumni.department}`}
            {alumni.graduation_year && ` — Angkatan ${alumni.graduation_year}`}
          </p>
        </div>
        {alumni.employment_status && (
          <Badge tone={EMPLOYMENT_STATUS_TONES[alumni.employment_status] ?? 'slate'}>
            {EMPLOYMENT_STATUS_LABELS[alumni.employment_status] ?? alumni.employment_status}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — profile */}
        <div className="space-y-6 lg:col-span-2">
          {/* Biodata */}
          <Card>
            <CardHeader title="Data Diri" icon={User} />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              {alumni.email && (
                <InfoRow icon={Mail} label="Email" value={alumni.email} />
              )}
              {alumni.phone && (
                <InfoRow icon={Phone} label="Telepon" value={alumni.phone} />
              )}
              {alumni.gender && (
                <InfoRow icon={User} label="Jenis Kelamin" value={alumni.gender === 'male' ? 'Laki-laki' : 'Perempuan'} />
              )}
              {alumni.birth_date && (
                <InfoRow icon={User} label="Tanggal Lahir" value={formatDate(alumni.birth_date)} />
              )}
              {alumni.birthplace_label && (
                <InfoRow icon={MapPin} label="Tempat Lahir" value={alumni.birthplace_label} />
              )}
              {alumni.address && (
                <InfoRow icon={MapPin} label="Alamat" value={alumni.address} />
              )}
            </div>
          </Card>

          {/* Career */}
          <Card>
            <CardHeader title="Karir & Pekerjaan" icon={Briefcase} />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              {alumni.company_name && (
                <InfoRow icon={Building2} label="Perusahaan" value={alumni.company_name} />
              )}
              {alumni.position && (
                <InfoRow icon={Briefcase} label="Posisi" value={alumni.position} />
              )}
              {alumni.location && (
                <InfoRow icon={MapPin} label="Lokasi Kerja" value={alumni.location} />
              )}
              {alumni.work_city && (
                <InfoRow icon={MapPin} label="Kota" value={alumni.work_city} />
              )}
              {alumni.work_province && (
                <InfoRow icon={MapPin} label="Provinsi" value={alumni.work_province} />
              )}
            </div>
          </Card>

          {/* Education */}
          {(alumni.study_institution || alumni.study_program) && (
            <Card>
              <CardHeader title="Pendidikan" icon={GraduationCap} />
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                {alumni.study_institution && (
                  <InfoRow icon={GraduationCap} label="Institusi" value={alumni.study_institution} />
                )}
                {alumni.study_program && (
                  <InfoRow icon={GraduationCap} label="Program Studi" value={alumni.study_program} />
                )}
              </div>
            </Card>
          )}

          {/* Skills */}
          {alumni.skills && alumni.skills.length > 0 && (
            <Card>
              <CardHeader title="Keahlian" />
              <div className="flex flex-wrap gap-2 p-5">
                {alumni.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-600">{skill}</span>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Business Info */}
          {alumni.business_name && (
            <Card>
              <CardHeader title="Usaha" icon={Building2} />
              <div className="space-y-3 p-5">
                {alumni.business_name && (
                  <InfoRow icon={Building2} label="Nama Usaha" value={alumni.business_name} />
                )}
                {alumni.business_field && (
                  <InfoRow icon={Briefcase} label="Bidang" value={alumni.business_field} />
                )}
                {alumni.business_address && (
                  <InfoRow icon={MapPin} label="Alamat" value={alumni.business_address} />
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value}</p>
      </div>
    </div>
  )
}
