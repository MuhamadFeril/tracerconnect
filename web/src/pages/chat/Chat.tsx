import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArrowLeft,
  Bell,
  BellOff,
  FileText,
  Flag,
  Image as ImageIcon,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { api, apiError, unwrapPage } from '../../lib/api'
import { avatarUrl, initials } from '../../lib/format'
import {
  useConversation,
  useConversationMessages,
  useConversations,
  useDeleteChatMessage,
  useMarkConversationRead,
  useNetworkingConnections,
  useReportConversation,
  useSendMessage,
  useStartConversation,
  useToggleConversationMute,
} from '../../hooks/queries'
import type { ChatMessage, Conversation } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, LoadingState } from '../../components/ui/StateViews'
import { useToast } from '../../components/ui/Toast'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return time
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function messagePreview(message: ChatMessage | null | undefined): string {
  if (!message) return 'Belum ada pesan'
  if (message.is_deleted) return 'Pesan dihapus'
  if (message.type === 'image') return '📷 Foto'
  if (message.type === 'file') return '📎 ' + (message.attachment?.name ?? 'File')
  return message.body ?? ''
}

function Avatar({ name, src, size = 'size-10', text = 'text-sm' }: { name?: string | null; src?: string | null; size?: string; text?: string }) {
  const [failed, setFailed] = useState(false)
  const url = src ? avatarUrl(src) : null
  if (url && !failed) {
    return <img src={url} alt="" onError={() => setFailed(true)} className={clsx('shrink-0 rounded-full object-cover', size)} />
  }
  return (
    <div className={clsx('flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 font-bold text-white', size, text)}>
      {initials(name)}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Conversation list                                                   */
/* ------------------------------------------------------------------ */

function ConversationList({
  conversations,
  activeId,
  onSelect,
  search,
  onSearch,
  onNew,
  loading,
}: {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  search: string
  onSearch: (value: string) => void
  onNew: () => void
  loading: boolean
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari percakapan…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
          />
        </div>
        <button
          onClick={onNew}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500"
          aria-label="Percakapan baru"
          title="Percakapan baru"
        >
          <Plus className="size-4.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <LoadingState label="Memuat percakapan…" />
        ) : conversations.length === 0 ? (
          <EmptyState title="Belum ada percakapan" description="Mulai chat dengan koneksi atau penawar lowongan." />
        ) : (
          conversations.map((conversation) => {
            const active = conversation.id === activeId
            return (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={clsx(
                  'flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors',
                  active ? 'bg-indigo-50/70' : 'hover:bg-slate-50',
                )}
              >
                <Avatar name={conversation.other?.name} src={conversation.other?.avatar_url} size="size-11" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{conversation.other?.name ?? '—'}</p>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {conversation.last_message ? formatTime(conversation.last_message.created_at) : formatTime(conversation.last_message_at)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className={clsx('truncate text-xs', conversation.unread_count > 0 ? 'font-medium text-slate-700' : 'text-slate-400')}>
                      {conversation.unread_count > 0 && conversation.last_message?.is_mine ? 'Anda: ' : ''}
                      {messagePreview(conversation.last_message)}
                    </p>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {conversation.muted && <BellOff className="size-3.5 text-slate-300" />}
                      {conversation.unread_count > 0 && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] leading-tight font-bold text-white">
                          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chat window                                                         */
/* ------------------------------------------------------------------ */

function MessageBubble({ message }: { message: ChatMessage }) {
  const deleteMessage = useDeleteChatMessage()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)

  const handleDelete = async () => {
    try {
      await deleteMessage.mutateAsync(message.id)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div className={clsx('group flex w-full', message.is_mine ? 'justify-end' : 'justify-start')}>
      <div className={clsx('relative max-w-[78%] sm:max-w-[70%]', message.is_mine ? 'items-end' : 'items-start')}>
        <div
          className={clsx(
            'rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
            message.is_mine
              ? 'rounded-br-md bg-indigo-600 text-white'
              : 'rounded-bl-md border border-slate-200 bg-white text-slate-800',
          )}
        >
          {message.is_deleted ? (
            <p className="text-slate-400 italic">Pesan dihapus</p>
          ) : message.type === 'image' && message.attachment ? (
            <a href={message.attachment.url} target="_blank" rel="noreferrer" className="block">
              <img
                src={message.attachment.url}
                alt={message.attachment.name}
                className="max-h-64 w-full max-w-xs rounded-xl object-cover"
              />
            </a>
          ) : message.type === 'file' && message.attachment ? (
            <a
              href={message.attachment.url}
              target="_blank"
              rel="noreferrer"
              className={clsx('flex items-center gap-2.5', message.is_mine ? 'text-white' : 'text-slate-800')}
            >
              <span className={clsx('flex size-9 shrink-0 items-center justify-center rounded-lg', message.is_mine ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600')}>
                <FileText className="size-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block max-w-40 truncate font-medium">{message.attachment.name}</span>
                <span className={clsx('block text-[11px]', message.is_mine ? 'text-indigo-100' : 'text-slate-400')}>
                  {Math.round(message.attachment.size / 1024)} KB
                </span>
              </span>
            </a>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
          )}
        </div>
        <p className={clsx('mt-1 text-[10px] text-slate-400', message.is_mine ? 'text-right' : 'text-left')}>
          {formatTime(message.created_at)}
        </p>

        {message.is_mine && !message.is_deleted && (
          <div
            className={clsx(
              'absolute -top-1 hidden rounded-lg border border-slate-200 bg-white p-0.5 shadow-md group-hover:flex',
              confirming ? 'flex' : '',
              message.is_mine ? '-left-2 translate-x-[-100%]' : '-right-2 translate-x-[100%]',
            )}
          >
            {confirming ? (
              <>
                <button onClick={() => setConfirming(false)} className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100">
                  Batal
                </button>
                <button onClick={handleDelete} className="rounded-md px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                  Hapus
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                title="Hapus pesan"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ChatWindow({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const toast = useToast()
  const conversationQuery = useConversation(conversationId)
  const page1 = useConversationMessages(conversationId, 1)
  const sendMessage = useSendMessage()
  const markRead = useMarkConversationRead()
  const toggleMute = useToggleConversationMute()
  const reportConversation = useReportConversation()

  const [older, setOlder] = useState<ChatMessage[]>([])
  const [olderPage, setOlderPage] = useState(1)
  const [text, setText] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const conversation = conversationQuery.data
  const newest = page1.data?.data ?? []
  // Newest-first from the API → oldest-first for rendering.
  const messages = useMemo(() => [...older, ...[...newest].reverse()], [older, newest])

  // Mark the conversation as read when it is opened.
  useEffect(() => {
    if (conversationId) {
      markRead.mutate(conversationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const loadOlder = async () => {
    const next = olderPage + 1
    try {
      const res = await unwrapPage<ChatMessage>(api.get(`/conversations/${conversationId}/messages`, { params: { page: next } }))
      setOlder((prev) => [...[...res.data].reverse(), ...prev])
      setOlderPage(next)
    } catch {
      // Older messages failed to load — keep what we have.
    }
  }

  const canLoadOlder = (page1.data?.meta?.current_page ?? 1) < (page1.data?.meta?.last_page ?? 1) || olderPage < (page1.data?.meta?.last_page ?? 1)

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const body = text.trim()
    if ((!body && !attachment) || sending) return

    setSending(true)
    try {
      const type = attachment ? (attachment.type.startsWith('image/') ? 'image' : 'file') : 'text'
      await sendMessage.mutateAsync({
        conversationId,
        type,
        body: body || undefined,
        attachment: attachment ?? undefined,
      })
      setText('')
      setAttachment(null)
      // Clear local pagination so the newest page includes the sent message.
      setOlder([])
      setOlderPage(1)
      markRead.mutate(conversationId)
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setSending(false)
    }
  }

  const handleToggleMute = async () => {
    if (!conversation) return
    setMenuOpen(false)
    try {
      await toggleMute.mutateAsync({ conversationId, muted: !conversation.muted })
      toast(conversation.muted ? 'Bisukan percakapan dihapus' : 'Percakapan dibisukan')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const handleReport = async () => {
    if (!reportReason.trim()) return
    setReportOpen(false)
    try {
      await reportConversation.mutateAsync({ conversationId, reason: reportReason.trim() })
      toast('Laporan percakapan terkirim')
      setReportReason('')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingState label="Memuat percakapan…" />
      </div>
    )
  }

  const isMuted = conversation.muted

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Kembali">
          <ArrowLeft className="size-5" />
        </button>
        <Avatar name={conversation.other?.name} src={conversation.other?.avatar_url} size="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{conversation.other?.name ?? '—'}</p>
          <p className="truncate text-xs text-slate-400">
            {conversation.job ? `${conversation.job.title} · ${conversation.job.company_name}` : 'Percakapan'}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Menu percakapan"
          >
            <MoreVertical className="size-4.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button
                  onClick={handleToggleMute}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  {isMuted ? <Bell className="size-4 text-slate-400" /> : <BellOff className="size-4 text-slate-400" />}
                  {isMuted ? 'Nyalakan notifikasi' : 'Bisukan'}
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setReportOpen(true)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <Flag className="size-4" /> Laporkan percakapan
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-4">
        {canLoadOlder && (
          <div className="flex justify-center">
            <button
              onClick={loadOlder}
              disabled={page1.isFetching}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600"
            >
              Muat pesan lama
            </button>
          </div>
        )}
        {messages.length === 0 && !page1.isPending ? (
          <EmptyState title="Belum ada pesan" description="Kirim sapaan pertama Anda." />
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="border-t border-slate-100 bg-white px-3 py-3">
        {attachment && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
            {attachment.type.startsWith('image/') ? (
              <ImageIcon className="size-4 text-indigo-500" />
            ) : (
              <FileText className="size-4 text-indigo-500" />
            )}
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{attachment.name}</span>
            <button type="button" onClick={() => setAttachment(null)} className="rounded-md p-1 text-slate-400 hover:text-rose-600" aria-label="Hapus lampiran">
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
            aria-label="Lampirkan file"
            title="Lampirkan file"
          >
            <Paperclip className="size-5" />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={1}
            placeholder="Tulis pesan…"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
          />
          <Button type="submit" loading={sending} disabled={(!text.trim() && !attachment) || sending} aria-label="Kirim pesan" className="shrink-0">
            <Send className="size-4" />
          </Button>
        </div>
      </form>

      {/* Report modal */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Laporkan percakapan"
        description="Laporkan percakapan ini kepada pengelola untuk ditinjau."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReportOpen(false)}>Batal</Button>
            <Button onClick={handleReport} disabled={!reportReason.trim()}>Kirim Laporan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
          >
            <option value="">Pilih alasan…</option>
            <option value="spam">Spam</option>
            <option value="abusive">Perilaku tidak pantas / pelecehan</option>
            <option value="scam">Penipuan</option>
            <option value="other">Lainnya</option>
          </select>
        </div>
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* New conversation (pick from connections)                            */
/* ------------------------------------------------------------------ */

function NewConversationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const connectionsQuery = useNetworkingConnections()
  const startConversation = useStartConversation()
  const [busyId, setBusyId] = useState<string | null>(null)

  const handlePick = async (userId: string) => {
    setBusyId(userId)
    try {
      const conversation = await startConversation.mutateAsync({ user_id: userId })
      onClose()
      navigate(`/chat/${conversation.id}`)
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const connections = connectionsQuery.data ?? []

  return (
    <Modal open={open} onClose={onClose} title="Percakapan baru" description="Pilih koneksi untuk memulai chat" size="md">
      <div className="max-h-96 space-y-1 overflow-y-auto">
        {connectionsQuery.isPending ? (
          <LoadingState label="Memuat koneksi…" />
        ) : connections.length === 0 ? (
          <EmptyState title="Belum ada koneksi" description="Hubungkan dahulu dengan alumni lain untuk bisa chat." />
        ) : (
          connections.map((connection) => (
            <button
              key={connection.id}
              onClick={() => handlePick(connection.user?.id ?? '')}
              disabled={!connection.user || busyId !== null}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <Avatar name={connection.user?.name} src={connection.user?.avatar_url} size="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{connection.user?.name}</p>
                {connection.alumni && (
                  <p className="truncate text-xs text-slate-400">
                    {[connection.alumni.department, connection.alumni.company_name, connection.alumni.position].filter(Boolean).join(' · ') || 'Alumni'}
                  </p>
                )}
              </div>
              <MessageCircle className="size-4 text-slate-300" />
            </button>
          ))
        )}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export function Chat() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const conversationsQuery = useConversations(search || undefined)
  const [newOpen, setNewOpen] = useState(false)

  const conversations = conversationsQuery.data ?? []
  const activeId = conversationId ?? null
  const activeExists = activeId ? conversations.some((c) => c.id === activeId) : false

  const handleSelect = (id: string) => navigate(`/chat/${id}`)
  const handleBack = () => navigate('/chat')

  return (
    <div className="mx-auto flex h-[calc(100vh-6.5rem)] max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Conversation list — always visible on desktop, drawer-like on mobile */}
      <div className={clsx('w-full border-r border-slate-100 sm:w-80 sm:shrink-0', activeId ? 'hidden sm:block' : 'block')}>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelect}
          search={search}
          onSearch={setSearch}
          onNew={() => setNewOpen(true)}
          loading={conversationsQuery.isPending}
        />
      </div>

      {/* Chat window */}
      <div className={clsx('min-w-0 flex-1', activeId ? 'block' : 'hidden sm:block')}>
        {activeId ? (
          activeExists || conversationsQuery.isPending ? (
            <ChatWindow conversationId={activeId} onBack={handleBack} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState title="Percakapan tidak ditemukan" description="Percakapan mungkin telah dihapus." />
            </div>
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <MessageCircle className="size-8" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">Pesan Anda</p>
              <p className="mt-1 max-w-xs text-sm text-slate-400">
                Pilih percakapan di samping, atau mulai chat baru dengan koneksi Anda.
              </p>
            </div>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="size-4" /> Percakapan baru
            </Button>
          </div>
        )}
      </div>

      <NewConversationModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
