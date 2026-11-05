import { ChartLine, Dumbbell, History, House } from 'lucide-react'
import type { AppTab } from '../types/models'

interface BottomTabBarProps {
  activeTab: AppTab
  onChange: (tab: AppTab) => void
}

const tabs = [
  { id: 'home', label: 'ホーム', Icon: House },
  { id: 'history', label: '履歴', Icon: History },
  { id: 'exercises', label: '種目', Icon: Dumbbell },
  { id: 'analytics', label: '分析', Icon: ChartLine }
] satisfies Array<{ id: AppTab; label: string; Icon: typeof House }>

export function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  return (
    <nav className="bottom-tabs" aria-label="メインナビゲーション">
      <div className="bottom-tabs__inner">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = id === activeTab
          return (
            <button
              className="bottom-tabs__item"
              data-active={isActive || undefined}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              onClick={() => onChange(id)}
              key={id}
            >
              <Icon aria-hidden="true" size={22} strokeWidth={isActive ? 2.4 : 1.9} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

