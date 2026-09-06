import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Ban,
  Check,
  Link2,
  Search,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from 'lucide-react'
import { apiError } from '../../lib/api'
import {
  useAcceptConnectionRequest,
  useNetworkingAlumni,
  useNetworkingBlocked,
  useNetworkingConnections,
  useNetworkingRequests,
  useRejectConnectionRequest,
  useRemoveConnection,
  useSendConnectionRequest,
  useUnblockUser,
} from '../../hooks/queries'
import { useDebounce } from '../../hooks/useDebounce'
import { avatarUrl, initials } from '../../lib/format'
import type { BlockedUserItem, ConnectionItem, NetworkingAlumni } from '../../lib/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge, EmploymentBadge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews'
import { useToast } from '../../components/ui/Toast'
import clsx from 'clsx'

type Tab = 'directory' | 'connections' | 'requests' | 'blocked'

interface CareerFields {
  employment_status: string | null
  company_name: string | null
  position: string | null
  business_field: string | null
  business_start_year: number | null
  location: string | null
  work_province: string | null
  work_city: string | null
  study_institution: string | null
  study_program: string | null
  study_entry_year: number | null
  business_name: string | null
  business_address: string | null
  business_province: string | null
  business_city: string | null
}

/** Baris utama detail karir sesuai status pekerjaan. */
function careerLine(a: CareerFields): string | null {
  switch (a.employment_status) {
    case 'working':
      return [a.position, a.company_name].filter(Boolean).join(' di ') || null
    case 'continuing_study':
      return [a.study_program, a.study_institution].filter(Boolean).join(' · ') || null
    case 'entrepreneur':
      return a.business_name || null
    default:
      return null
  }
}

/** Lokasi kerja/usaha sesuai status (kota · provinsi). */
function careerLocation(a: CareerFields): string | null {
  if (a.employment_status === 'entrepreneur') {
    return [a.business_city, a.business_province].filter(Boolean).join(', ') || null
  }
  return [a.work_city, a.work_province].filter(Boolean).join(', ') || null
}

/** Bidang usaha/industri untuk status bekerja & wirausaha. */
function careerFieldLine(a: CareerFields): string | null {
  if (a.employment_status !== 'working' && a.employment_status !== 'entrepreneur') return null
  const bits = [a.business_field]
  if (a.employment_status === 'entrepreneur' && a.business_start_year) {
    bits.push(`Sejak ${a.business_start_year}`)
  }
  return bits.filter(Boolean).join(' · ') || null
}

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'directory', label: 'Direktori Alumni', icon: Users },
  { key: 'connections', label: 'Koneksi', icon: Link2 },
  { key: 'requests', label: 'Permintaan', icon: UserPlus },
  { key: 'blocked', label: 'Diblokir', icon: Ban },
]

function Avatar({ name, url, size = 'size-11', text = 'text-sm' }: { name: string; url?: string | null; size?: string; text?: string }) {
  const src = avatarUrl(url)
  const [failed, setFailed] = useState(false)

  // Reset the failure flag whenever the URL changes, so a newly-valid avatar
  // (e.g. after re-uploading the profile photo) is retried instead of being
  // stuck on the initials fallback forever.
  useEffect(() => {
    setFailed(false)
  }, [src])

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={clsx('shrink-0 rounded-full object-cover ring-1 ring-slate-200', size)}
      />
    )
  }
  return (
    <div className={clsx('flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 font-bold text-white', size, text)}>
      {initials(name)}
    </div>
  )
}

function DirectoryEntry({ alumni }: { alumni: NetworkingAlumni }) {
  const send = useSendConnectionRequest()
  const toast = useToast()
  const { status } = alumni.connection

  const onConnect = async () => {
    try {
      await send.mutateAsync(alumni.user_id)
      toast('Permintaan koneksi terkirim')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <Card className="flex flex-col p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3.5">
        <Link to={`/jejaring/${alumni.id}`} className="shrink-0">
          <Avatar name={alumni.name} url={alumni.avatar_url} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/jejaring/${alumni.id}`} className="hover:text-indigo-600">
            <h3 className="truncate text-sm font-semibold text-slate-900">{alumni.name}</h3>
          </Link>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {[alumni.department, alumni.graduation_year ? `Angkatan ${alumni.graduation_year}` : null].filter(Boolean).join(' · ') || 'Alumni'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <EmploymentBadge status={alumni.employment_status} />
        {alumni.connection.status === 'connected' && <Badge tone="green"><UserCheck className="size-3" /> Terhubung</Badge>}
      </div>

      {(() => {
        const line = careerLine(alumni)
        const field = careerFieldLine(alumni)
        const loc = careerLocation(alumni)
        const details = [line, field, loc].filter(Boolean)
        if (details.length === 0) return null
        return (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600">
            {details.join(' · ')}
          </p>
        )
      })()}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        {status === 'none' && (
          <Button size="sm" onClick={onConnect} loading={send.isPending}>
            <UserPlus className="size-3.5" /> Hubungkan
          </Button>
        )}
        {status === 'pending_outgoing' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
            <UserPlus className="size-3.5" /> Permintaan terkirim
          </span>
        )}
        {status === 'pending_incoming' && (
          <Link to={`/jejaring/${alumni.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
            Menunggu tanggapan Anda →
          </Link>
        )}
        {status === 'connected' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
            <UserCheck className="size-3.5" /> Terhubung
          </span>
        )}
        <Link to={`/jejaring/${alumni.id}`} className="ml-auto text-xs font-medium text-slate-400 transition-colors hover:text-indigo-600">
          Lihat profil
        </Link>
      </div>
    </Card>
  )
}

function RequestEntry({ item }: { item: ConnectionItem }) {
  const accept = useAcceptConnectionRequest()
  const reject = useRejectConnectionRequest()
  const toast = useToast()
  const alumni = item.alumni
  const name = item.user?.name ?? '—'

  const onAccept = async () => {
    try {
      await accept.mutateAsync(item.id)
      toast(`Anda dan ${name} kini terhubung`)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const onReject = async () => {
    try {
      await reject.mutateAsync(item.id)
      toast('Permintaan koneksi ditolak')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
      <Link to={`/jejaring/${alumni?.id}`} className="shrink-0">
        <Avatar name={name} url={item.user?.avatar_url} size="size-12" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/jejaring/${alumni?.id}`} className="hover:text-indigo-600">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        </Link>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {[alumni?.department, alumni?.graduation_year ? `Angkatan ${alumni.graduation_year}` : null].filter(Boolean).join(' · ') || 'Alumni'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={onAccept} loading={accept.isPending}>
          <Check className="size-3.5" /> Terima
        </Button>
        <Button size="sm" variant="secondary" onClick={onReject} loading={reject.isPending}>
          <X className="size-3.5" /> Tolak
        </Button>
      </div>
    </div>
  )
}

function BlockedEntry({ item }: { item: BlockedUserItem }) {
  const unblock = useUnblockUser()
  const toast = useToast()
  const name = item.user?.name ?? '—'

  const onUnblock = async () => {
    try {
      await unblock.mutateAsync(item.id)
      toast(`${name} dibuka blokirnya`)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
      <Avatar name={name} url={item.user?.avatar_url} size="size-12" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        <p className="mt-0.5 text-xs text-slate-500">Tidak akan muncul di direktori Anda</p>
      </div>
      <Button size="sm" variant="secondary" onClick={onUnblock} loading={unblock.isPending} className="shrink-0">
        <UserCheck className="size-3.5" /> Buka Blokir
      </Button>
    </div>
  )
}

function ConnectionEntry({ item }: { item: ConnectionItem }) {
  const remove = useRemoveConnection()
  const toast = useToast()
  const alumni = item.alumni
  const name = item.user?.name ?? '—'

  const onRemove = async () => {
    try {
      await remove.mutateAsync(item.id)
      toast('Koneksi dihapus')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
      <Link to={`/jejaring/${alumni?.id}`} className="shrink-0">
        <Avatar name={name} url={item.user?.avatar_url} size="size-12" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/jejaring/${alumni?.id}`} className="hover:text-indigo-600">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        </Link>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {alumni ? careerLine(alumni) || careerLocation(alumni) || [alumni.department, alumni.graduation_year ? `Angkatan ${alumni.graduation_year}` : null].filter(Boolean).join(' · ') || 'Alumni' : 'Alumni'}
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={onRemove} loading={remove.isPending} className="shrink-0 text-slate-400 hover:text-rose-600">
        <UserX className="size-3.5" /> Lepas
      </Button>
    </div>
  )
}

export function Networking() {
  const [tab, setTab] = useState<Tab>('directory')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [page, setPage] = useState(1)

  const directory = useNetworkingAlumni({ search: debouncedSearch || undefined, page })
  const connections = useNetworkingConnections()
  const requests = useNetworkingRequests()
  const blocked = useNetworkingBlocked()

  const rows = directory.data?.data ?? []
  const requestsCount = requests.data?.length ?? 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jejaring Alumni"
        subtitle="Terhubung dengan sesama alumni dari institusi Anda"
        actions={
          <div className="flex max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={clsx(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  tab === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                <Icon className="size-3.5" />
                {label}
                {key === 'requests' && requestsCount > 0 && (
                  <span className={clsx(
                    'inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                    tab === key ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700',
                  )}>
                    {requestsCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        }
      />

      {tab === 'directory' && (
        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Cari nama, perusahaan, atau jabatan…"
                className="pl-9"
              />
            </div>
          </div>

          {directory.isPending ? (
            <LoadingState />
          ) : directory.isError ? (
            <ErrorState message="Gagal memuat direktori alumni" onRetry={() => directory.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              title={debouncedSearch ? 'Tidak ditemukan' : 'Belum ada alumni'}
              description={debouncedSearch ? 'Tidak ada alumni yang cocok dengan pencarian Anda.' : 'Belum ada alumni lain yang dapat dihubungi.'}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((alumni) => (
                  <DirectoryEntry key={alumni.id} alumni={alumni} />
                ))}
              </div>
              <Pagination meta={directory.data?.meta} onPageChange={setPage} />
            </>
          )}
        </Card>
      )}

      {tab === 'connections' && (
        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Koneksi Anda</h3>
            <p className="mt-0.5 text-xs text-slate-500">Alumni yang sudah terhubung dengan Anda</p>
          </div>
          {connections.isPending ? (
            <LoadingState />
          ) : connections.isError ? (
            <ErrorState message="Gagal memuat koneksi" onRetry={() => connections.refetch()} />
          ) : (connections.data ?? []).length === 0 ? (
            <EmptyState
              title="Belum ada koneksi"
              description="Jelajahi direktori alumni dan kirim permintaan koneksi."
              action={
                <Button size="sm" onClick={() => setTab('directory')}>
                  <Users className="size-3.5" /> Lihat Direktori
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {(connections.data ?? []).map((item) => (
                <ConnectionEntry key={item.id} item={item} />
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'requests' && (
        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Permintaan Koneksi</h3>
            <p className="mt-0.5 text-xs text-slate-500">Alumni yang ingin terhubung dengan Anda</p>
          </div>
          {requests.isPending ? (
            <LoadingState />
          ) : requests.isError ? (
            <ErrorState message="Gagal memuat permintaan" onRetry={() => requests.refetch()} />
          ) : (requests.data ?? []).length === 0 ? (
            <EmptyState title="Tidak ada permintaan" description="Tidak ada permintaan koneksi masuk saat ini." />
          ) : (
            <div className="divide-y divide-slate-100">
              {(requests.data ?? []).map((item) => (
                <RequestEntry key={item.id} item={item} />
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'blocked' && (
        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Pengguna Diblokir</h3>
            <p className="mt-0.5 text-xs text-slate-500">Mereka tidak dapat melihat atau mengirim permintaan kepada Anda</p>
          </div>
          {blocked.isPending ? (
            <LoadingState />
          ) : blocked.isError ? (
            <ErrorState message="Gagal memuat daftar blokir" onRetry={() => blocked.refetch()} />
          ) : (blocked.data ?? []).length === 0 ? (
            <EmptyState title="Tidak ada yang diblokir" description="Belum ada pengguna yang Anda blokir." />
          ) : (
            <div className="divide-y divide-slate-100">
              {(blocked.data ?? []).map((item) => (
                <BlockedEntry key={item.id} item={item} />
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
