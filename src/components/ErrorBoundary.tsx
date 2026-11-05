import { AlertTriangle } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('アプリの表示中にエラーが発生しました', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="fatal-error">
        <AlertTriangle aria-hidden="true" size={34} />
        <h1>画面を表示できません</h1>
        <p>記録は端末内に残っています。アプリを閉じて、もう一度開いてください。</p>
        <button className="button button--primary" type="button" onClick={() => window.location.reload()}>
          再読み込み
        </button>
      </main>
    )
  }
}

