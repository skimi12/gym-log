import { RefreshCw, X } from 'lucide-react'

interface UpdatePromptProps {
  visible: boolean
  hasActiveSession: boolean
  onUpdate: () => void
  onDismiss: () => void
}

export function UpdatePrompt({ visible, hasActiveSession, onUpdate, onDismiss }: UpdatePromptProps) {
  if (!visible) return null
  return (
    <aside className="update-prompt" role="status" aria-live="polite">
      <RefreshCw aria-hidden="true" size={19} />
      <div className="update-prompt__copy">
        <strong>更新があります</strong>
        <span>{hasActiveSession ? 'トレーニング終了後に更新できます' : '新しいバージョンを利用できます'}</span>
      </div>
      {!hasActiveSession ? (
        <button className="button button--small" type="button" onClick={onUpdate}>更新</button>
      ) : null}
      <button className="icon-button icon-button--small" type="button" aria-label="更新通知を閉じる" onClick={onDismiss}>
        <X aria-hidden="true" size={18} />
      </button>
    </aside>
  )
}

