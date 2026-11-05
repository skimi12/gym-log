import { Check, History, House } from 'lucide-react'
import type { AppSettings, Exercise, WorkoutSession, WorkoutSet } from '../types/models'
import { summarizeSession } from '../utils/analytics'
import { formatDuration, formatJapaneseDate } from '../utils/dates'
import { formatWeightNumber } from '../utils/units'
import './summary.css'

interface SummaryPageProps {
  session: WorkoutSession
  exercises: Exercise[]
  sets: WorkoutSet[]
  unit: AppSettings['unit']
  onHome: () => void
  onOpenHistory: () => void
}

export function SummaryPage({ session, exercises, sets, unit, onHome, onOpenHistory }: SummaryPageProps) {
  const summary = summarizeSession(session, exercises, sets)

  return (
    <main className="summary-page">
      <div className="summary-check" aria-hidden="true"><Check size={28} /></div>
      <p className="page-kicker">{formatJapaneseDate(session.startedAt)}</p>
      <h1>トレーニング完了</h1>
      <p className="summary-duration">{formatDuration(session.startedAt, session.endedAt)}</p>

      <dl className="summary-grid">
        <div><dt>種目</dt><dd>{summary.exerciseCount}</dd></div>
        <div><dt>セット</dt><dd>{summary.setCount}</dd></div>
        <div><dt>総レップ</dt><dd>{summary.totalReps}</dd></div>
        <div>
          <dt>通常重量のボリューム</dt>
          <dd>{formatWeightNumber(summary.weightedVolumeKg, unit)}<small>{unit}・reps</small></dd>
        </div>
      </dl>

      {session.note && <div className="summary-note"><strong>メモ</strong><p>{session.note}</p></div>}

      <div className="summary-actions">
        <button className="button button--primary" type="button" onClick={onHome}><House size={19} /> ホームへ</button>
        <button className="button button--secondary" type="button" onClick={onOpenHistory}><History size={19} /> 履歴を編集</button>
      </div>
    </main>
  )
}
