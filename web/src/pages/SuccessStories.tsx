import { useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { apiError } from '../lib/api'
import { useSuccessStoryMutations, useSuccessStories } from '../hooks/queries'
import { useDebounce } from '../hooks/useDebounce'
import { getUser } from '../lib/auth'
import { avatarUrl } from '../lib/format'
import type { SuccessStory } from '../lib/types'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Table, TBody, Td, Th, THead, TRow } from '../components/ui/Table'
import { Pagination } from '../components/ui/Pagination'
import { StatusBadge } from '../components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews'
import { useToast } from '../components/ui/Toast'

const STORY_CATEGORIES = [
  { value: 'career', label: 'Karier' },
  { value: 'study', label: 'Melanjutkan Studi' },
  { value: 'entrepreneur', label: 'Wirausaha' },
  { value: 'achievement', label: 'Prestasi' },
  { value: 'other', label: 'Lainnya' },
]

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 2

function initialForm(story?: SuccessStory | null) {
  return {
    title: story?.title ?? '',
    category: story?.category ?? 'career',
    content: story?.content ?? '',
    status: story?.status ?? 'draft',
    alumni_id: '',
  }
}

function StoryFormModal({
  open,
  onClose,
  story,
}: {
  open: boolean
  onClose: () => void
  story?: SuccessStory | null
}) {
  const mutations = useSuccessStoryMutations()
  const toast = useToast()
  const [form, setForm] = useState(() => initialForm(story))
  const [error, setError] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const isEditing = Boolean(story)
  const isSaving = mutations.create.isPending || mutations.update.isPending

  useEffect(() => {
    if (open) {
      setForm(initialForm(story))
      setError(null)
      setCoverFile(null)
      setCoverPreview(null)
    }
  }, [open, story])

  // Clean up the object URL when the preview is replaced or the modal closes.
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverPreview])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const onPickCover = (file: File | null) => {
    setError(null)
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Format cover harus jpg, jpeg, png, atau webp')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError('Ukuran cover maksimal 2 MB')
      return
    }
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!coverFile && !isEditing) {
      setError('Foto cover wajib diunggah')
      return
    }

    const payload = new FormData()
    payload.append('title', form.title)
    payload.append('category', form.category)
    payload.append('content', form.content)
    payload.append('status', form.status)
    if (form.alumni_id) payload.append('alumni_id', form.alumni_id)
    if (coverFile) payload.append('cover_image', coverFile)

    try {
      if (story) {
        await mutations.update.mutateAsync({ id: story.id, payload })
        toast('Kisah sukses berhasil diperbarui')
      } else {
        await mutations.create.mutateAsync(payload)
        toast('Kisah sukses berhasil dibuat')
      }
      onClose()
    } catch (err) {
      setError(apiError(err))
    }
  }

  const currentCover = story?.cover_image_url ? avatarUrl(story.cover_image_url) : null
  const showCover = coverPreview ?? currentCover

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Kisah Sukses' : 'Tulis Kisah Sukses'}
      description={isEditing ? `Mengubah ${story?.title}` : 'Bagikan inspirasi dari alumni kepada seluruh alumni'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button type="submit" form="story-form" loading={isSaving}>
            {isEditing ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="story-form" onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}

        <Field label="Judul" required>
          <Input
            required
            name="title"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Contoh: Alumni SMKN 1 Tracer Langsung Direkrut Setelah PKL"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kategori">
            <Select name="category" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {STORY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Field>
        </div>

        <Field label="Foto Cover" required={!isEditing} hint="Format jpg, jpeg, png, webp — maksimal 2 MB">
          {showCover ? (
            <div className="relative overflow-hidden rounded-xl border border-slate-200">
              <img src={showCover} alt="Pratinjau cover" className="h-44 w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  if (coverPreview) URL.revokeObjectURL(coverPreview)
                  setCoverFile(null)
                  setCoverPreview(null)
                }}
                className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-slate-900/70 text-white transition-colors hover:bg-slate-900"
                aria-label="Hapus cover"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 py-8 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/40">
              <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <ImageIcon className="size-5" />
              </div>
              <span className="text-sm font-semibold text-slate-600">Klik untuk memilih foto cover</span>
              <span className="text-xs text-slate-400">Foto membuat berita lebih menarik</span>
              <input
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="hidden"
                onChange={(e) => {
                  onPickCover(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
            </label>
          )}
        </Field>

        <Field label="Isi Berita" required>
          <Textarea
            required
            name="content"
            rows={7}
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            placeholder="Tulis kisah lengkapnya: siapa alumninya, apa yang ia capai, dan bagaimana perjalanannya…"
          />
        </Field>


      </form>
    </Modal>
  )
}

export function SuccessStories() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const currentUser = getUser()
  const isAlumniOnly = Boolean(currentUser?.roles?.length) && currentUser!.roles.every((role) => role === 'alumni')

  const { data, isPending, isError, refetch } = useSuccessStories({
    search: debouncedSearch || undefined,
    status: status || undefined,
    category: category || undefined,
    page,
  })
  const mutations = useSuccessStoryMutations()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SuccessStory | null>(null)
  const [deleting, setDeleting] = useState<SuccessStory | null>(null)

  const rows = useMemo(() => data?.data ?? [], [data])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kisah Sukses"
        subtitle="Berbagi inspirasi alumni — seperti alumni yang direkrut perusahaan setelah PKL"
        actions={
          !isAlumniOnly ? (
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" /> Tulis Kisah Sukses
            </Button>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari judul…"
              className="pl-9"
            />
          </div>
          <Select name="category-filter" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="w-full sm:w-48">
            <option value="">Semua Kategori</option>
            {STORY_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
          {!isAlumniOnly && (
            <Select name="status-filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-full sm:w-44">
              <option value="">Semua Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </Select>
          )}
        </div>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Gagal memuat kisah sukses" onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Belum ada kisah sukses"
            description="Tulis kisah pertama alumni yang menginspirasi."
          />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Judul</Th>
                <Th>Kategori</Th>
                <Th>Status</Th>
                <Th className="text-right">Aksi</Th>
              </THead>
              <TBody>
                {rows.map((story) => (
                  <TRow key={story.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <img
                          src={avatarUrl(story.cover_image_url) ?? undefined}
                          alt=""
                          className="size-10 shrink-0 rounded-lg object-cover"
                        />
                        <p className="max-w-md truncate font-medium text-slate-900">{story.title}</p>
                      </div>
                    </Td>
                    <Td>
                      <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        {story.category_label}
                      </span>
                    </Td>
                    <Td><StatusBadge status={story.status} /></Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(story); setFormOpen(true) }}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(story)}
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

      <StoryFormModal
        key={editing?.id ?? 'new-story'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        story={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await mutations.remove.mutateAsync(deleting.id)
            toast('Kisah sukses berhasil dihapus')
            setDeleting(null)
          } catch (err) {
            toast(apiError(err), 'error')
            setDeleting(null)
          }
        }}
        loading={mutations.remove.isPending}
        title="Hapus Kisah Sukses"
        message={
          <>
            Kisah sukses <span className="font-semibold text-slate-800">{deleting?.title}</span> akan dihapus secara permanen.
          </>
        }
      />
    </div>
  )
}
