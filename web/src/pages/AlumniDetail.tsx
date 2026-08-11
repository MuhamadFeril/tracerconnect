import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, Cake, CalendarDays, GraduationCap, Mail, MapPin, Phone, User } from 'lucide-react'
import { useAlumnus } from '../hooks/queries'
import { formatDate } from '../lib/format'
import { Card } from '../components/ui/Card'
import { LoadingState, ErrorState } from '../components/ui/StateViews'
import { EmploymentBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-800">{value || '—'}</p>
      </div>
    </div>
  )
}

export function AlumniDetail() {
  const { id = '' } = useParams()
  const { data: a, isPending, isError, refetch } = useAlumnus(id)

  if (isPending) return <LoadingState label="Memuat profil alumni…" />
  if (isError || !a) return <ErrorState message="Gagal memuat data alumni" onRetry={() => refetch()} />

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/alumni" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500">
        <ArrowLeft className="size-4" /> Kembali ke Alumni
      </Link>

      <Card>
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-800 text-xl font-bold text-white">
            {a.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">{a.name}</h1>
            <p className="text-sm text-slate-500">
              {a.nis_nim ? <span className="font-mono">{a.nis_nim}</span> : '—'}
              {' · '}
              {a.department ?? 'Tanpa jurusan'}
              {a.graduation_year ? ` · Lulus ${a.graduation_year}` : ''}
            </p>
          </div>
          <EmploymentBadge status={a.employment_status} />
        </div>

        <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2">
          <InfoItem icon={User} label="Jenis Kelamin" value={a.gender === 'male' ? 'Laki-laki' : a.gender === 'female' ? 'Perempuan' : null} />
          <InfoItem icon={Cake} label="Tanggal Lahir" value={formatDate(a.birth_date)} />
          <InfoItem icon={MapPin} label="Tempat Lahir" value={a.birthplace_label ?? a.birthplace} />
          <InfoItem icon={Mail} label="Email" value={a.email} />
          <InfoItem icon={Phone} label="No. HP" value={a.phone} />
          <InfoItem icon={MapPin} label="Alamat" value={a.address} />
          <InfoItem icon={CalendarDays} label="Tahun Lulus" value={a.graduation_year} />
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Informasi Pekerjaan</h3>
        </div>
        <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2">
          <InfoItem icon={Briefcase} label="Perusahaan" value={a.company_name} />
          <InfoItem icon={GraduationCap} label="Jabatan" value={a.position} />
          <InfoItem icon={MapPin} label="Lokasi Kerja" value={a.location} />
        </div>
        <div className="px-6 pb-5">
          <p className="mb-2 text-xs text-slate-400">Status Pekerjaan</p>
          <EmploymentBadge status={a.employment_status} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => window.history.back()}>Kembali</Button>
      </div>
    </div>
  )
}
