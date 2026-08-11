import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Hapus',
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: React.ReactNode
  confirmLabel?: string
  loading?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-50">
          <AlertTriangle className="size-5 text-rose-600" />
        </div>
        <p className="pt-2 text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
    </Modal>
  )
}
