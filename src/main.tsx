import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import { initAnalyticsEngine } from './native/analyticsEngine'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('Application root was not found')

const appRoot = createRoot(root)

async function start() {
  try {
    await initAnalyticsEngine()
    appRoot.render(
      <ErrorBoundary>
        <ToastProvider><App /></ToastProvider>
      </ErrorBoundary>
    )
  } catch {
    appRoot.render(
      <main className="page">
        <h1>読み込みに失敗しました</h1>
        <p>接続を確認して再試行してください。保存済みの記録は端末内に保持されています。</p>
        <button type="button" onClick={() => { void start() }}>再試行</button>
      </main>
    )
  }
}

void start()
