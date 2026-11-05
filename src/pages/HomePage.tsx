import { CalendarDays, ChevronRight, Clock3, Dumbbell, Play, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import type { AppSettings, Exercise, WorkoutSession, WorkoutSet } from '../types/models'
import { formatRepresentativeSet } from '../utils/analytics'
import { formatDateWithWeekday, formatShortDate, formatTime } from '../utils/dates'
import { EmptyState } from '../components/EmptyState'
import { ExerciseList } from '../components/ExerciseList'
import { InstallHint } from '../components/InstallHint'
import { PageHeader } from '../components/PageHeader'

export interface HomeFavoriteItem {
  exercise: Exercise
  lastPerformedAt?: string
  lastSets?: WorkoutSet[]
}

export interface HomeRecentSession {
  session: WorkoutSession
  exerciseCount: number
  setCount: number
}

interface HomePageProps {
  activeSession?: WorkoutSession
  favorites: HomeFavoriteItem[]
  recentSessions: HomeRecentSession[]
  unit: AppSettings['unit']
  installHintVisible?: boolean
  onDismissInstallHint?: () => void | Promise<void>
  onStartWorkout: () => void | Promise<void>
  onResumeWorkout: (sessionId: string) => void
  onOpenExercise: (exerciseId: string) => void
  onOpenHistory: (sessionId: string) => void
  onOpenSettings: () => void
  onToggleFavorite: (exercise: Exercise) => void | Promise<void>
  onMoveFavorite: (exercise: Exercise, direction: 'up' | 'down') => void | Promise<void>
  onError?: (message: string) => void
}

export function HomePage({
  activeSession,
  favorites,
  recentSessions,
  unit,
  installHintVisible = false,
  onDismissInstallHint,
  onStartWorkout,
  onResumeWorkout,
  onOpenExercise,
  onOpenHistory,
  onOpenSettings,
  onToggleFavorite,
  onMoveFavorite,
  onError
}: HomePageProps) {
  const [starting, setStarting] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)

  const startWorkout = async () => {
    if (activeSession || starting) return
    setStarting(true)
    try {
      await onStartWorkout()
    } catch (error) {
      console.error('トレーニングを開始できませんでした', error)
      onError?.('トレーニングの開始に失敗しました')
    } finally {
      setStarting(false)
    }
  }

  const toggleFavorite = async (exercise: Exercise) => {
    try {
      await onToggleFavorite(exercise)
    } catch (error) {
      console.error('お気に入りの更新に失敗しました', error)
      onError?.('お気に入りの保存に失敗しました')
    }
  }

  const moveFavorite = async (exercise: Exercise, direction: 'up' | 'down') => {
    try {
      await onMoveFavorite(exercise, direction)
    } catch (error) {
      console.error('お気に入りの並べ替えに失敗しました', error)
      onError?.('並べ替えの保存に失敗しました')
    }
  }

  const favoriteExercises = favorites.map((item) => item.exercise)

  return (
    <main className="page page--with-tabs home-page">
      <PageHeader
        title="筋トレ記録"
        eyebrow="GYM LOG"
        trailing={
          <button className="icon-button" type="button" aria-label="設定を開く" onClick={onOpenSettings}>
            <SettingsIcon aria-hidden="true" size={22} />
          </button>
        }
      />

      {installHintVisible && onDismissInstallHint ? (
        <InstallHint visible onDismiss={() => void onDismissInstallHint()} />
      ) : null}

      {activeSession ? (
        <section className="resume-panel" aria-labelledby="active-workout-title">
          <div>
            <p className="eyebrow">進行中のセッション</p>
            <h2 id="active-workout-title">トレーニングを再開</h2>
            <p><Clock3 aria-hidden="true" size={16} /> {formatShortDate(activeSession.startedAt)} {formatTime(activeSession.startedAt)}から</p>
          </div>
          <button className="button button--primary button--full" type="button" onClick={() => onResumeWorkout(activeSession.id)}>
            <Play aria-hidden="true" size={20} fill="currentColor" />続きを記録
          </button>
        </section>
      ) : (
        <button className="start-workout-button" type="button" onClick={() => void startWorkout()} disabled={starting}>
          <span className="start-workout-button__icon"><Dumbbell aria-hidden="true" size={25} /></span>
          <span><strong>{starting ? '開始中…' : 'トレーニング開始'}</strong><small>今日の記録をはじめる</small></span>
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      )}

      <section className="page-section" aria-labelledby="favorites-title">
        <div className="section-heading">
          <div><p className="eyebrow">すぐ記録</p><h2 id="favorites-title">お気に入り</h2></div>
          {favorites.length > 1 ? (
            <button className="text-button" type="button" aria-pressed={reorderMode} onClick={() => setReorderMode((value) => !value)}>
              {reorderMode ? '完了' : '並べ替え'}
            </button>
          ) : null}
        </div>
        {favorites.length === 0 ? (
          <EmptyState title="お気に入り種目はまだありません" description="種目タブの☆をタップすると、ここからすぐ開けます。" compact />
        ) : reorderMode ? (
          <ExerciseList
            exercises={favoriteExercises}
            onSelect={(exercise) => onOpenExercise(exercise.id)}
            onToggleFavorite={(exercise) => void toggleFavorite(exercise)}
            onMoveFavorite={(exercise, direction) => void moveFavorite(exercise, direction)}
            reorderMode
            dense
          />
        ) : (
          <ul className="favorite-summary-list">
            {favorites.map(({ exercise, lastPerformedAt, lastSets }) => (
              <li key={exercise.id}>
                <button type="button" onClick={() => onOpenExercise(exercise.id)}>
                  <span className="favorite-summary-list__copy">
                    <strong>{exercise.name}</strong>
                    <small>
                      {lastPerformedAt && lastSets?.length
                        ? `前回 ${formatRepresentativeSet(lastSets, exercise.loadType, unit)}`
                        : 'まだ記録がありません'}
                    </small>
                  </span>
                  <span className="favorite-summary-list__date">{lastPerformedAt ? formatShortDate(lastPerformedAt) : '—'}</span>
                  <ChevronRight aria-hidden="true" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="page-section" aria-labelledby="recent-title">
        <div className="section-heading"><div><p className="eyebrow">直近の記録</p><h2 id="recent-title">最近のトレーニング</h2></div></div>
        {recentSessions.length === 0 ? (
          <EmptyState title="まだトレーニング記録がありません" compact />
        ) : (
          <ul className="session-list session-list--compact">
            {recentSessions.map(({ session, exerciseCount, setCount }) => (
              <li key={session.id}>
                <button type="button" onClick={() => onOpenHistory(session.id)}>
                  <CalendarDays aria-hidden="true" size={20} />
                  <span><strong>{formatDateWithWeekday(session.startedAt)}</strong><small>{exerciseCount}種目 / {setCount}セット</small></span>
                  <ChevronRight aria-hidden="true" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
