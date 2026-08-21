import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { apiError, downloadFile } from '../lib/api'
import {
  useAlumni,
  useDeleteAlumni,
  useDepartments,
  useDistricts,
  useGraduationYears,
  useProvinces,
  useRegencies,
  useSaveAlumni,
} from '../hooks/queries'
import { useDebounce } from '../hooks/useDebounce'
import type { Alumni, EmploymentStatus } from '../lib/types'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Table, TBody, Td, Th, THead, TRow } from '../components/ui/Table'
import { Pagination } from '../components/ui/Pagination'
import { EmploymentBadge } from '../components/ui/Badge'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

function AlumniFormModal({
  open,
  onClose,
  alumni,
}: {
  open: boolean
  onClose: () => void
  alumni?: Alumni | null
}) {
  const saveAlumni = useSaveAlumni()
  const { data: departments } = useDepartments()
  const { data: years } = useGraduationYears()
  const { data: provinces } = useProvinces()
  const [provinceId, setProvinceId] = useState('')
  const { data: regencies } = useRegencies(provinceId || null)
  const [regencyId, setRegencyId] = useState('')
  const { data: districts } = useDistricts(regencyId || null)
  const [districtId, setDistrictId] = useState('')
  const toast = useToast()
  const [form, setForm] = useState(() => initialForm(alumni))
  const [error, setError] = useState<string | null>(null)

  // Reset the form every time the modal opens (the modal stays mounted).
  useEffect(() => {
    if (open) {
      setForm(initialForm(alumni))
      setError(null)
      setProvinceId('')
      setRegencyId('')
      setDistrictId('')
    }
  }, [open, alumni])

  // Prefill the region cascade when editing: match stored names to ids once
  // each level's options are available. Comparison is case-insensitive and
  // trim-tolerant so legacy/imported data still resolves.
  const norm = (value?: string | null) => (value ?? '').trim().toLowerCase()

  useEffect(() => {
    if (!open || !alumni?.birthplace_province || !provinces?.length) return
    const target = norm(alumni.birthplace_province)
    const match = provinces.find((p) => norm(p.name) === target)
    if (match) setProvinceId(String(match.id))
  }, [open, alumni, provinces])

  useEffect(() => {
    if (!open || !alumni?.birthplace_regency || !provinceId || !regencies?.length) return
    const target = norm(alumni.birthplace_regency)
    const match = regencies.find((r) => norm(r.name) === target)
    if (match) setRegencyId(String(match.id))
  }, [open, alumni, provinceId, regencies])

  useEffect(() => {
    if (!open || !alumni?.birthplace || !regencyId || !districts?.length) return
    const target = norm(alumni.birthplace)
    const match = districts.find((d) => norm(d.name) === target)
    if (match) setDistrictId(String(match.id))
  }, [open, alumni, regencyId, districts])

  const set = (key: string, value: string | null) => setForm((f) => ({ ...f, [key]: value }))

  const handleProvinceChange = (id: string) => {
    setProvinceId(id)
    setRegencyId('')
    setDistrictId('')
    set('birthplace_province', provinces?.find((p) => String(p.id) === id)?.name ?? null)
    set('birthplace_regency', null)
    set('birthplace', null)
  }

  const handleRegencyChange = (id: string) => {
    setRegencyId(id)
    setDistrictId('')
    set('birthplace_regency', regencies?.find((r) => String(r.id) === id)?.name ?? null)
    set('birthplace', null)
  }

  const handleDistrictChange = (id: string) => {
    setDistrictId(id)
    set('birthplace', districts?.find((d) => String(d.id) === id)?.name ?? null)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const payload: Partial<Alumni> = {
      name: form.name,
      nis_nim: form.nis_nim || null,
      gender: (form.gender || null) as Alumni['gender'],
      birth_date: form.birth_date || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      department_id: form.department_id || null,
      graduation_year_id: form.graduation_year_id || null,
      employment_status: (form.employment_status || null) as EmploymentStatus | null,
      birthplace: form.birthplace || null,
      birthplace_regency: form.birthplace_regency || null,
      birthplace_province: form.birthplace_province || null,
      company_name: form.company_name || null,
      position: form.position || null,
      business_field: form.business_field || null,
      business_start_year: form.business_start_year ? Number(form.business_start_year) : null,
      location: form.location || null,
      work_province: form.work_province || null,
      work_city: form.work_city || null,
      study_institution: form.study_institution || null,
      study_program: form.study_program || null,
      study_entry_year: form.study_entry_year ? Number(form.study_entry_year) : null,
      business_name: form.business_name || null,
      business_address: form.business_address || null,
      business_province: form.business_province || null,
      business_city: form.business_city || null,
    }
    try {
      await saveAlumni.mutateAsync({ id: alumni?.id, payload })
      toast(alumni ? 'Alumni berhasil diperbarui' : 'Alumni berhasil ditambahkan')
      onClose()
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={alumni ? 'Edit Alumni' : 'Tambah Alumni'}
      description={alumni ? `Mengubah data ${alumni.name}` : 'Lengkapi data lulusan baru'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saveAlumni.isPending}>
            Batal
          </Button>
          <Button type="submit" form="alumni-form" loading={saveAlumni.isPending}>
            {alumni ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="alumni-form" onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nama Lengkap" required>
            <Input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nama lulusan" />
          </Field>
          <Field label="NIS / NIM">
            <Input value={form.nis_nim ?? ''} onChange={(e) => set('nis_nim', e.target.value)} placeholder="Contoh: 20221001" />
          </Field>
          <Field label="Jenis Kelamin">
            <Select value={form.gender ?? ''} onChange={(e) => set('gender', e.target.value || null)}>
              <option value="">— Pilih —</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </Select>
          </Field>
          <Field label="Tanggal Lahir">
            <Input type="date" value={form.birth_date ?? ''} onChange={(e) => set('birth_date', e.target.value || null)} />
          </Field>
          <Field label="Provinsi (Tempat Lahir)">
            <Select
              value={provinceId}
              onChange={(e) => handleProvinceChange(e.target.value)}
            >
              <option value="">— Pilih provinsi —</option>
              {provinces?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Kabupaten/Kota">
            <Select
              value={regencyId}
              disabled={!provinceId}
              onChange={(e) => handleRegencyChange(e.target.value)}
            >
              <option value="">{provinceId ? '— Pilih kabupaten/kota —' : 'Pilih provinsi dahulu'}</option>
              {regencies?.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Kecamatan">
            <Select
              value={districtId}
              disabled={!regencyId}
              onChange={(e) => handleDistrictChange(e.target.value)}
            >
              <option value="">{regencyId ? '— Pilih kecamatan —' : 'Pilih kabupaten/kota dahulu'}</option>
              {districts?.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="nama@example.com" />
          </Field>
          <Field label="No. HP" hint="Minimal 10 karakter">
            <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="08xxxxxxxxxx" />
          </Field>
          <Field label="Jurusan">
            <Select value={form.department_id ?? ''} onChange={(e) => set('department_id', e.target.value || null)}>
              <option value="">— Pilih —</option>
              {departments?.data.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tahun Lulus">
            <Select value={form.graduation_year_id ?? ''} onChange={(e) => set('graduation_year_id', e.target.value || null)}>
              <option value="">— Pilih —</option>
              {years?.data.map((y) => (
                <option key={y.id} value={y.id}>{y.year}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status Pekerjaan">
            <Select value={form.employment_status ?? ''} onChange={(e) => set('employment_status', e.target.value || null)}>
              <option value="">— Pilih —</option>
              <option value="working">Bekerja</option>
              <option value="unemployed">Belum Bekerja</option>
              <option value="entrepreneur">Wirausaha</option>
              <option value="continuing_study">Melanjutkan Studi</option>
            </Select>
          </Field>
          <Field label="Alamat">
            <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </Field>
          {form.employment_status === 'working' && (
            <>
              <Field label="Perusahaan">
                <Input value={form.company_name ?? ''} onChange={(e) => set('company_name', e.target.value)} />
              </Field>
              <Field label="Jabatan">
                <Input value={form.position ?? ''} onChange={(e) => set('position', e.target.value)} />
              </Field>
              <Field label="Bidang Usaha / Industri">
                <Input value={form.business_field ?? ''} onChange={(e) => set('business_field', e.target.value)} />
              </Field>
              <Field label="Tahun Mulai Bekerja">
                <Input
                  type="number"
                  min={1990}
                  value={form.business_start_year ?? ''}
                  onChange={(e) => set('business_start_year', e.target.value || null)}
                />
              </Field>
              <Field label="Provinsi Kerja">
                <Input value={form.work_province ?? ''} onChange={(e) => set('work_province', e.target.value)} />
              </Field>
              <Field label="Kota Kerja">
                <Input value={form.work_city ?? ''} onChange={(e) => set('work_city', e.target.value)} />
              </Field>
              <Field label="Lokasi Kerja">
                <Input value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} />
              </Field>
            </>
          )}
          {form.employment_status === 'continuing_study' && (
            <>
              <Field label="Kuliah di">
                <Input value={form.study_institution ?? ''} onChange={(e) => set('study_institution', e.target.value)} placeholder="Contoh: Universitas Indonesia" />
              </Field>
              <Field label="Jurusan / Prodi">
                <Input value={form.study_program ?? ''} onChange={(e) => set('study_program', e.target.value)} placeholder="Contoh: Teknik Informatika" />
              </Field>
              <Field label="Tahun Masuk Kuliah">
                <Input
                  type="number"
                  min={1990}
                  value={form.study_entry_year ?? ''}
                  onChange={(e) => set('study_entry_year', e.target.value || null)}
                  placeholder="Contoh: 2021"
                />
              </Field>
            </>
          )}
          {form.employment_status === 'entrepreneur' && (
            <>
              <Field label="Nama Usaha">
                <Input value={form.business_name ?? ''} onChange={(e) => set('business_name', e.target.value)} placeholder="Contoh: Toko Kopi Nusantara" />
              </Field>
              <Field label="Bidang Usaha">
                <Input value={form.business_field ?? ''} onChange={(e) => set('business_field', e.target.value)} />
              </Field>
              <Field label="Tahun Mulai Usaha">
                <Input
                  type="number"
                  min={1990}
                  value={form.business_start_year ?? ''}
                  onChange={(e) => set('business_start_year', e.target.value || null)}
                />
              </Field>
              <Field label="Provinsi Usaha">
                <Input value={form.business_province ?? ''} onChange={(e) => set('business_province', e.target.value)} />
              </Field>
              <Field label="Kota Usaha">
                <Input value={form.business_city ?? ''} onChange={(e) => set('business_city', e.target.value)} />
              </Field>
              <Field label="Alamat Usaha">
                <Input value={form.business_address ?? ''} onChange={(e) => set('business_address', e.target.value)} placeholder="Contoh: Jl. Raya No. 45, Jakarta Selatan" />
              </Field>
            </>
          )}
        </div>
      </form>
    </Modal>
  )
}

function initialForm(alumni?: Alumni | null) {
  return {
    name: alumni?.name ?? '',
    nis_nim: alumni?.nis_nim ?? '',
    gender: alumni?.gender ?? '',
    birth_date: alumni?.birth_date ?? '',
    birthplace: alumni?.birthplace ?? '',
    birthplace_regency: alumni?.birthplace_regency ?? '',
    birthplace_province: alumni?.birthplace_province ?? '',
    email: alumni?.email ?? '',
    phone: alumni?.phone ?? '',
    address: alumni?.address ?? '',
    department_id: alumni?.department_id ?? '',
    graduation_year_id: alumni?.graduation_year_id ?? '',
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
  }
}

export function AlumniList() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useAlumni({
    search: debouncedSearch || undefined,
    department_id: departmentId || undefined,
    employment_status: status || undefined,
    page,
  })
  const { data: departments } = useDepartments()
  const deleteAlumni = useDeleteAlumni()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Alumni | null>(null)
  const [deleting, setDeleting] = useState<Alumni | null>(null)
  const [exporting, setExporting] = useState(false)

  const rows = useMemo(() => data?.data ?? [], [data])

  const onExport = async () => {  
    setExporting(true)
    try {
      await downloadFile('/alumni/export', `alumni-${new Date().toISOString().slice(0, 10)}.csv`)
      toast('Export CSV berhasil diunduh')
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alumni"
        subtitle="Kelola data lulusan dan status kerja"
        actions={
          <>
            <Button variant="secondary" onClick={onExport} loading={exporting}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" /> Tambah Alumni
            </Button>
          </>
        }
      />

      <Card className="animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari nama atau NIS…"
              className="pl-9"
            />
          </div>
          <Select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1) }} className="w-full sm:w-56">
            <option value="">Semua Jurusan</option>
            {departments?.data.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-full sm:w-48">
            <option value="">Semua Status</option>
            <option value="working">Bekerja</option>
            <option value="unemployed">Belum Bekerja</option>
            <option value="entrepreneur">Wirausaha</option>
            <option value="continuing_study">Melanjutkan Studi</option>
          </Select>
        </div>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat data alumni" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Tidak ada alumni"
            description="Coba ubah kata kunci pencarian atau tambahkan data alumni baru."
          />
        ) : (
          <>
            <Table>
              <THead>
                <Th>NIS / NIM</Th>
                <Th>Nama</Th>
                <Th>Jurusan</Th>
                <Th>Tahun Lulus</Th>
                <Th>Status</Th>
                <Th className="text-right">Aksi</Th>
              </THead>
              <TBody>
                {rows.map((a, i) => (
                  <TRow
                    key={a.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                  >
                    <Td className="font-mono text-xs">{a.nis_nim ?? '—'}</Td>
                    <Td>
                      <Link to={`/alumni/${a.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                        {a.name}
                      </Link>
                    </Td>
                    <Td>{a.department ?? '—'}</Td>
                    <Td>{a.graduation_year ?? '—'}</Td>
                    <Td><EmploymentBadge status={a.employment_status} /></Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/alumni/${a.id}`}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                          title="Detail"
                        >
                          <Eye className="size-4" />
                        </Link>
                        <button
                          onClick={() => { setEditing(a); setFormOpen(true) }}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(a)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </Td>
                  </TRow>
                ))}
              </TBody>
            </Table>
            <Pagination meta={data?.meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      <AlumniFormModal
        key={editing?.id ?? 'new-alumni'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        alumni={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteAlumni.mutateAsync(deleting.id)
            toast('Alumni berhasil dihapus')
            setDeleting(null)
          } catch (err) {
            toast(apiError(err), 'error')
            setDeleting(null)
          }
        }}
        loading={deleteAlumni.isPending}
        title="Hapus Alumni"
        message={
          <>
            Data alumni <span className="font-semibold text-slate-800">{deleting?.name}</span> akan dihapus secara permanen.
            Tindakan ini tidak dapat dibatalkan.
          </>
        }
      />
    </div>
  )
}
