import { AlertTriangle, Database, HardDrive, Moon, Smartphone, Sun } from 'lucide-react'
import { useState } from 'react'
import type { AppSettings } from '../types/models'
import { PageHeader } from '../components/PageHeader'

interface SettingsPageProps {
  settings: AppSettings
  onBack: () => void
  onChangeUnit: (unit: AppSettings['unit']) => void | Promise<void>
  onChangeTheme: (theme: AppSettings['theme']) => void | Promise<void>
  onError?: (message: string) => void
}

const themeOptions: Array<{
  value: AppSettings['theme']
  label: string
  Icon: typeof Smartphone
}> = [
  { value: 'system', label: 'システム', Icon: Smartphone },
  { value: 'light', label: 'ライト', Icon: Sun },
  { value: 'dark', label: 'ダーク', Icon: Moon }
]

export function SettingsPage({ settings, onBack, onChangeUnit, onChangeTheme, onError }: SettingsPageProps) {
  const [savingKey, setSavingKey] = useState<string>()

  const save = async (key: string, operation: () => void | Promise<void>) => {
    setSavingKey(key)
    try {
      await operation()
    } catch (error) {
      console.error('設定の保存に失敗しました', error)
      onError?.('設定の保存に失敗しました')
    } finally {
      setSavingKey(undefined)
    }
  }

  return (
    <main className="page settings-page">
      <PageHeader title="設定" onBack={onBack} compact />

      <section className="settings-section" aria-labelledby="unit-setting-title">
        <div className="settings-section__heading">
          <h2 id="unit-setting-title">重量単位</h2>
          <p>表示と入力に使う単位。保存データは常にkgで管理されます。</p>
        </div>
        <div className="segmented-control" role="radiogroup" aria-label="重量単位">
          {(['kg', 'lb'] as const).map((unit) => (
            <button
              className="segmented-control__item"
              data-active={settings.unit === unit || undefined}
              role="radio"
              aria-checked={settings.unit === unit}
              type="button"
              onClick={() => void save(`unit-${unit}`, () => onChangeUnit(unit))}
              disabled={Boolean(savingKey)}
              key={unit}
            >
              <strong>{unit}</strong><small>{unit === 'kg' ? 'キログラム' : 'ポンド'}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section" aria-labelledby="theme-setting-title">
        <div className="settings-section__heading">
          <h2 id="theme-setting-title">外観モード</h2>
          <p>ジムの照明に合わせて切り替えられます。</p>
        </div>
        <div className="theme-options" role="radiogroup" aria-label="外観モード">
          {themeOptions.map(({ value, label, Icon }) => (
            <button
              className="theme-option"
              data-active={settings.theme === value || undefined}
              role="radio"
              aria-checked={settings.theme === value}
              type="button"
              onClick={() => void save(`theme-${value}`, () => onChangeTheme(value))}
              disabled={Boolean(savingKey)}
              key={value}
            >
              <Icon aria-hidden="true" size={21} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section" aria-labelledby="data-title">
        <div className="settings-section__heading">
          <h2 id="data-title">データとプライバシー</h2>
        </div>
        <div className="info-rows">
          <div className="info-row">
            <Database aria-hidden="true" size={21} />
            <span><strong>この端末に保存</strong><small>記録はIndexedDBに保存され、外部に送信されません。</small></span>
          </div>
          <div className="info-row">
            <HardDrive aria-hidden="true" size={21} />
            <span><strong>オフライン対応</strong><small>一度読み込むと、通信なしでも記録できます。</small></span>
          </div>
        </div>
        <aside className="warning-box" role="note">
          <AlertTriangle aria-hidden="true" size={22} />
          <div>
            <strong>データ消失について</strong>
            <p>SafariのWebサイトデータを削除すると、トレーニング記録が失われる可能性があります。v1にはクラウドバックアップはありません。</p>
          </div>
        </aside>
      </section>

      <footer className="settings-footer">筋トレ記録 <span aria-hidden="true">·</span> 個人用PWA</footer>
    </main>
  )
}

