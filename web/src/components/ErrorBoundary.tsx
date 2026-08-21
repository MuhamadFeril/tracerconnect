import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle className="size-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Terjadi Kesalahan</h2>
            <p className="mt-2 text-sm text-slate-500">
              Terjadi error yang tidak terduga. Silakan muat ulang halaman.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-5"
              size="sm"
            >
              <RefreshCw className="size-4" />
              Muat Ulang
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
