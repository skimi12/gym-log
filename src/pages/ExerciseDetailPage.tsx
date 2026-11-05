import { BarChart3, CalendarDays, ChevronRight, Star, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import type { AppSettings, Exercise, LoadType, WorkoutSession, WorkoutSet } from '../types/models'
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '../types/models'
import { formatWorkoutSet } from '../utils/analytics'
import { formatDateWithWeekday } from '../utils/dates'
import { EmptyState } from '../components/EmptyState'
import { FavoriteButton } from '../components/FavoriteButton'
import { PageHeader } from '../components/PageHeader'

export interface ExerciseHistoryRecord {
  session: WorkoutSession
  sets: WorkoutSet[]
}

interface ExerciseDetailPageProps {
  exercise: Exercise
  records: ExerciseHistoryRecord[]
  unit: AppSettings['unit']
  onBack: () => void
  onToggleFavorite: (exercise: Exercise) => void | Promise<void>
  onOpenHistory: (sessionId: string) => void
  onOpenAnalytics: (exerciseId: string) => void
  onArchiveCustomExercise?: (exercise: Exercise) => void | Promise<void>
  onError?: (message: string) => void
}

const LOAD_TYPE_LABELS: Record<LoadType, string> = {
  weighted: '通常重量',
  bodyweight: '自重',
  bodyweightAdded: '自重＋追加重量',
  assisted: 'アシスト'
}

export function ExerciseDetailPage({
  exercise,
  records,
  unit,
  onBack,
  onToggleFavorite,
  onOpenHistory,
  onOpenAnalytics,
  onArchiveCustomExercise,
  onError
}: ExerciseDetailPageProps) {
  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.session.startedAt).getTime() - new Date(a.session.startedAt).getTime()),
    [records]
  )
  const recentRecords = sortedRecords.slice(0, 3)
  const olderRecords = sortedRecords.slice(3)

  const toggleFavorite = async () => {
    try {
      await onToggleFavorite(exercise)
    } catch (error) {
      console.error('お気に入りの更新に失敗しました', error)
      onError?.('お気に入りの保存に失敗しました')
    }
  }

  const archive = async () => {
    if (!onArchiveCustomExercise || exercise.isBuiltIn) return
    const confirmed = window.confirm(
      `「${exercise.name}」を種目一覧から非表示にしますか？\n過去のトレーニング記録は残ります。`
    )
    if (!confirmed) return
    try {
      await onArchiveCustomExercise(exercise)
      onBack()
    } catch (error) {
      console.error('カスタム種目を非表示にできませんでした', error)
      onError?.('種目の更新に失敗しました')
    }
  }

  return (
    <main className="page exercise-detail-page">
      <PageHeader
        title={exercise.name}
        eyebrow={exercise.isBuiltIn ? '初期種目' : 'カスタム種目'}
        onBack={onBack}
        trailing={
          <FavoriteButton
            isFavorite={exercise.isFavorite}
            exerciseName={exercise.name}
            onToggle={() => void toggleFavorite()}
          />
        }
        compact
      />

      {!exercise.isActive ? <p className="status-pill">種目一覧で非表示</p> : null}

      <section className="detail-section" aria-labelledby="exercise-info-title">
        <h2 id="exercise-info-title">種目情報</h2>
        <dl className="definition-list">
          <div><dt>主対象部位</dt><dd>{MUSCLE_LABELS[exercise.primaryMuscle]}</dd></div>
          <div><dt>補助対象部位</dt><dd>{exercise.secondaryMuscles.length ? exercise.secondaryMuscles.map((muscle) => MUSCLE_LABELS[muscle]).join('・') : '—'}</dd></div>
          <div><dt>器具</dt><dd>{EQUIPMENT_LABELS[exercise.equipment]}</dd></div>
          <div><dt>マシン詳細</dt><dd>{exercise.equipmentDetail || '—'}</dd></div>
          <div><dt>記録方式</dt><dd>{LOAD_TYPE_LABELS[exercise.loadType]}</dd></div>
        </dl>
        {exercise.aliases.length ? <p className="aliases"><span>検索別名</span>{exercise.aliases.join('・')}</p> : null}
      </section>

      <button className="analytics-link" type="button" onClick={() => onOpenAnalytics(exercise.id)}>
        <BarChart3 aria-hidden="true" size={23} />
        <span><strong>成長推移を見る</strong><small>重量・回数・推定1RM・ボリューム</small></span>
        <ChevronRight aria-hidden="true" size={19} />
      </button>

      <section className="detail-section" aria-labelledby="recent-records-title">
        <h2 id="recent-records-title">最近の記録</h2>
        {recentRecords.length === 0 ? (
          <EmptyState title="この種目の記録はまだありません" compact />
        ) : (
          <div className="record-cards">
            {recentRecords.map(({ session, sets }) => (
              <button className="record-card" type="button" onClick={() => onOpenHistory(session.id)} key={session.id}>
                <span className="record-card__header">
                  <strong><CalendarDays aria-hidden="true" size={17} />{formatDateWithWeekday(session.startedAt)}</strong>
                  <ChevronRight aria-hidden="true" size={18} />
                </span>
                <span className="record-card__sets">
                  {sets.slice().sort((a, b) => a.order - b.order).map((set, index) => (
                    <span key={set.id}><small>{index + 1}</small>{formatWorkoutSet(set, exercise.loadType, unit)}</span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {olderRecords.length ? (
        <section className="detail-section" aria-labelledby="past-records-title">
          <h2 id="past-records-title">過去履歴</h2>
          <ul className="compact-history-list">
            {olderRecords.map(({ session, sets }) => (
              <li key={session.id}>
                <button type="button" onClick={() => onOpenHistory(session.id)}>
                  <span><strong>{formatDateWithWeekday(session.startedAt)}</strong><small>{sets.length}セット</small></span>
                  <ChevronRight aria-hidden="true" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!exercise.isBuiltIn && onArchiveCustomExercise ? (
        <section className="danger-zone">
          <h2>カスタム種目</h2>
          <p>非表示にしても、過去の記録と分析データは残ります。</p>
          <button className="button button--danger button--full" type="button" onClick={() => void archive()} disabled={!exercise.isActive}>
            <Trash2 aria-hidden="true" size={19} />{exercise.isActive ? '種目一覧から非表示' : '非表示済み'}
          </button>
        </section>
      ) : null}
    </main>
  )
}
