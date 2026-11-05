import { ChevronRight } from 'lucide-react'
import type { WorkoutSession } from '../types/models'
import { formatJapaneseDate, formatTime } from '../utils/dates'
import './history.css'

export interface HistoryListItem {
  session: WorkoutSession
  exerciseCount: number
  setCount: number
}

interface HistoryPageProps {
  items: HistoryListItem[]
  hasMore: boolean
  onLoadMore: () => void
  onOpenSession: (sessionId: string) => void
}

export function HistoryPage({ items, hasMore, onLoadMore, onOpenSession }: HistoryPageProps) {
  return (
    <main className="page page--with-tabs history-page">
      <header className="page-title-row">
        <div>
          <p className="page-kicker">記録</p>
          <h1>履歴</h1>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>まだトレーニング記録がありません</strong>
          <span>最初のトレーニングを終えると、ここに表示されます。</span>
        </div>
      ) : (
        <ol className="history-list">
          {items.map(({ session, exerciseCount, setCount }) => (
            <li key={session.id}>
              <button className="history-row" type="button" onClick={() => onOpenSession(session.id)}>
                <span className="history-row__main">
                  <strong>{formatJapaneseDate(session.startedAt)}</strong>
                  <span>
                    {formatTime(session.startedAt)}〜{session.endedAt ? formatTime(session.endedAt) : '—'}
                  </span>
                </span>
                <span className="history-row__counts">
                  {exerciseCount}種目 / {setCount}セット
                </span>
                <ChevronRight aria-hidden="true" size={19} />
              </button>
            </li>
          ))}
        </ol>
      )}
      {hasMore ? (
        <button className="button button--secondary history-load-more" type="button" onClick={onLoadMore}>
          さらに表示
        </button>
      ) : null}
    </main>
  )
}
