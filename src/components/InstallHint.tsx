import { Share, X } from 'lucide-react'

interface InstallHintProps {
  visible: boolean
  onDismiss: () => void
}

export function InstallHint({ visible, onDismiss }: InstallHintProps) {
  if (!visible) return null
  return (
    <aside className="inline-notice install-hint" aria-label="iPhoneへの追加方法">
      <Share aria-hidden="true" size={21} />
      <p>
        Safariの共有ボタンから<strong>「ホーム画面に追加」</strong>すると、アプリとして使えます。
      </p>
      <button className="icon-button icon-button--small" type="button" aria-label="案内を閉じる" onClick={onDismiss}>
        <X aria-hidden="true" size={18} />
      </button>
    </aside>
  )
}

