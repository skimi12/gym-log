import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clock3, Plus, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { EmptyState } from '../../components/EmptyState'
import { ExercisePicker } from '../../components/ExercisePicker'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { db } from '../../db/database'
import { toggleFavorite as toggleExerciseFavorite } from '../../services/exerciseService'
import {
  addExerciseToSession,
  addSet,
  completeSession,
  copyPreviousSets,
  deleteSession,
  deleteSet,
  duplicateSet,
  getPreviousCompletedRecord,
  moveSessionExercise,
  moveSet,
  removeExerciseFromSession,
  updateSessionNote,
  updateSet,
  type PreviousCompletedRecord
} from '../../services/workoutService'
import type {
  AppSettings,
  Exercise,
  SessionExercise,
  WorkoutSession,
  WorkoutSet
} from '../../types/models'
import {
  formatDuration,
  formatElapsed,
  formatJapaneseDate,
  formatShortDate,
  formatTime
} from '../../utils/dates'
import { ExerciseSetEditor } from './ExerciseSetEditor'
import './session-editor.css'

type ErrorHandler = (message: string, error?: unknown) => void

export interface SessionEditorProps {
  sessionId: string
  unit: AppSettings['unit']
  onBack: () => void | Promise<void>
  onDeleted: () => void | Promise<void>
  onComplete?: (sessionId: string) => void | Promise<void>
  onError: ErrorHandler
}

interface SessionEditorSnapshot {
  session: WorkoutSession | null
  sessionExercises: SessionExercise[]
  sets: WorkoutSet[]
}

type SnapshotResult =
  | { data: SessionEditorSnapshot; error?: never }
  | { data?: never; error: unknown }

type CatalogResult =
  | { data: Exercise[]; error?: never }
  | { data?: never; error: unknown }

const emptySnapshot = (session: WorkoutSession | null): SessionEditorSnapshot => ({
  session,
  sessionExercises: [],
  sets: []
})

async function loadSnapshot(sessionId: string): Promise<SessionEditorSnapshot> {
  const session = await db.workoutSessions.get(sessionId)
  if (!session) return emptySnapshot(null)

  const [sessionExercises, sets] = await Promise.all([
    db.sessionExercises.where('sessionId').equals(sessionId).sortBy('order'),
    db.workoutSets.where('sessionId').equals(sessionId).toArray()
  ])

  return {
    session,
    sessionExercises,
    sets
  }
}

function useElapsedTime(startedAt: string | undefined, enabled: boolean): string {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!enabled) return undefined
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 1_000)
    return () => window.clearInterval(timer)
  }, [enabled, startedAt])

  return startedAt ? formatElapsed(startedAt, now) : '00:00:00'
}

export function SessionEditor({
  sessionId,
  unit,
  onBack,
  onDeleted,
  onComplete,
  onError
}: SessionEditorProps) {
  const result = useLiveQuery<SnapshotResult>(async () => {
    try {
      return { data: await loadSnapshot(sessionId) }
    } catch (error) {
      return { error }
    }
  }, [sessionId])
  const catalogResult = useLiveQuery<CatalogResult>(async () => {
    try {
      return { data: await db.exercises.toArray() }
    } catch (error) {
      return { error }
    }
  }, [])
  const snapshot = result?.data
  const session = snapshot?.session ?? undefined
  const catalog = catalogResult?.data ?? []
  const [pickerOpen, setPickerOpen] = useState(false)
  const [terminalBusy, setTerminalBusy] = useState(false)
  const [previousByExerciseId, setPreviousByExerciseId] = useState(
    () => new Map<string, PreviousCompletedRecord>()
  )
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([])
  const [noteDraft, setNoteDraft] = useState('')
  const noteDirtyRef = useRef(false)
  const latestNoteRef = useRef('')
  const noteSessionIdRef = useRef<string | undefined>(undefined)
  const noteQueueRef = useRef<Promise<void>>(Promise.resolve())
  const terminalActionRef = useRef(false)
  const reportedQueryErrorRef = useRef<unknown>(undefined)

  const reportError = useCallback(
    (message: string, error: unknown) => {
      console.error(message, error)
      onError(message, error)
    },
    [onError]
  )

  const exerciseIdsKey = useMemo(
    () => snapshot?.sessionExercises.map((entry) => entry.exerciseId).join('|') ?? '',
    [snapshot?.sessionExercises]
  )
  const previousSessionId = session?.id
  const previousStartedAt = session?.startedAt

  // Previous records do not depend on edits in the current session. Keeping
  // this outside useLiveQuery prevents every weight/reps save from re-reading
  // years of history.
  useEffect(() => {
    if (!previousSessionId || !previousStartedAt) {
      setPreviousByExerciseId(new Map())
      return undefined
    }

    let cancelled = false
    const loadPreviousRecords = async () => {
      try {
        const exerciseIds = exerciseIdsKey ? exerciseIdsKey.split('|') : []
        const entries = await Promise.all(exerciseIds.map(async (exerciseId) => {
          const record = await getPreviousCompletedRecord(exerciseId, {
            excludeSessionId: previousSessionId,
            beforeStartedAt: previousStartedAt
          })
          return [exerciseId, record] as const
        }))
        if (cancelled) return
        const next = new Map<string, PreviousCompletedRecord>()
        for (const [exerciseId, record] of entries) {
          if (record) next.set(exerciseId, record)
        }
        setPreviousByExerciseId(next)
      } catch (error) {
        if (!cancelled) reportError('前回記録を読み込めませんでした', error)
      }
    }
    void loadPreviousRecords()
    return () => {
      cancelled = true
    }
  }, [exerciseIdsKey, previousSessionId, previousStartedAt, reportError])

  // Recent exercises are picker-only information. Read them in two indexed
  // queries when the picker opens instead of during the set-entry hot path.
  useEffect(() => {
    if (!pickerOpen || !previousSessionId) return undefined

    let cancelled = false
    const loadRecentExercises = async () => {
      try {
        const completedSessions = (await db.workoutSessions
          .where('status')
          .equals('completed')
          .toArray())
          .filter((candidate) => candidate.id !== previousSessionId)
          .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
          .slice(0, 30)
        const sessionIds = completedSessions.map((candidate) => candidate.id)
        if (sessionIds.length === 0) {
          if (!cancelled) setRecentExerciseIds([])
          return
        }
        const rows = await db.sessionExercises.where('sessionId').anyOf(sessionIds).toArray()
        const sessionRank = new Map(sessionIds.map((id, index) => [id, index]))
        rows.sort((a, b) =>
          (sessionRank.get(a.sessionId) ?? Number.MAX_SAFE_INTEGER)
            - (sessionRank.get(b.sessionId) ?? Number.MAX_SAFE_INTEGER)
          || a.order - b.order
        )
        const next = [...new Set(rows.map((row) => row.exerciseId))].slice(0, 12)
        if (!cancelled) setRecentExerciseIds(next)
      } catch (error) {
        if (!cancelled) reportError('最近使った種目を読み込めませんでした', error)
      }
    }
    void loadRecentExercises()
    return () => {
      cancelled = true
    }
  }, [pickerOpen, previousSessionId, reportError])

  useEffect(() => {
    const error = result?.error ?? catalogResult?.error
    if (!error || reportedQueryErrorRef.current === error) return
    reportedQueryErrorRef.current = error
    reportError('記録を読み込めませんでした', error)
  }, [catalogResult?.error, reportError, result?.error])

  useEffect(() => {
    if (!session) return
    if (noteSessionIdRef.current !== session.id) {
      noteSessionIdRef.current = session.id
      noteDirtyRef.current = false
      latestNoteRef.current = session.note
      setNoteDraft(session.note)
      return
    }
    if (!noteDirtyRef.current && session.note !== latestNoteRef.current) {
      latestNoteRef.current = session.note
      setNoteDraft(session.note)
    }
  }, [session])

  const enqueueNoteSave = useCallback(
    (value: string): Promise<boolean> => {
      const task = noteQueueRef.current.then(async () => {
        try {
          await updateSessionNote(sessionId, value)
          if (latestNoteRef.current === value) noteDirtyRef.current = false
          return true
        } catch (error) {
          reportError('メモの保存に失敗しました', error)
          return false
        }
      })
      noteQueueRef.current = task.then(() => undefined)
      return task
    },
    [reportError, sessionId]
  )

  useEffect(() => {
    if (!session || !noteDirtyRef.current) return undefined
    const timer = window.setTimeout(() => {
      if (!terminalActionRef.current) void enqueueNoteSave(latestNoteRef.current)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [enqueueNoteSave, noteDraft, session])

  useEffect(() => {
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden' && noteDirtyRef.current) {
        void enqueueNoteSave(latestNoteRef.current)
      }
    }
    document.addEventListener('visibilitychange', saveWhenHidden)
    return () => document.removeEventListener('visibilitychange', saveWhenHidden)
  }, [enqueueNoteSave])

  const runMutation = useCallback(
    async (failureMessage: string, operation: () => Promise<unknown>): Promise<boolean> => {
      try {
        await operation()
        return true
      } catch (error) {
        reportError(failureMessage, error)
        return false
      }
    },
    [reportError]
  )

  const flushNote = useCallback(async (): Promise<boolean> => {
    await noteQueueRef.current
    if (!session) return true
    return enqueueNoteSave(latestNoteRef.current)
  }, [enqueueNoteSave, session])

  const leavePage = async () => {
    if (!(await flushNote())) return
    try {
      await onBack()
    } catch (error) {
      reportError('画面を閉じられませんでした', error)
    }
  }

  const addExercise = async (exercise: Exercise) => {
    const added = await runMutation('種目の追加に失敗しました', () =>
      addExerciseToSession(sessionId, exercise.id)
    )
    if (added) setPickerOpen(false)
  }

  const toggleFavorite = async (exercise: Exercise): Promise<void> => {
    await runMutation('お気に入りの更新に失敗しました', () =>
      toggleExerciseFavorite(exercise.id)
    )
  }

  const finishSession = async () => {
    if (!session || terminalBusy) return
    if (!window.confirm('トレーニングを終了しますか？')) return
    setTerminalBusy(true)
    try {
      await noteQueueRef.current
      await updateSessionNote(session.id, latestNoteRef.current)
      await completeSession(session.id)
      await onComplete?.(session.id)
    } catch (error) {
      reportError('トレーニングの終了に失敗しました', error)
    } finally {
      setTerminalBusy(false)
    }
  }

  const removeWholeSession = async () => {
    if (!session || terminalBusy) return
    const message = session.status === 'active'
      ? '進行中のセッションと、入力したすべての記録を破棄しますか？'
      : 'このトレーニング記録を削除しますか？この操作は取り消せません。'
    if (!window.confirm(message)) return
    setTerminalBusy(true)
    terminalActionRef.current = true
    noteDirtyRef.current = false
    try {
      await noteQueueRef.current
      await deleteSession(session.id)
      await onDeleted()
    } catch (error) {
      reportError('トレーニング記録の削除に失敗しました', error)
      terminalActionRef.current = false
      setTerminalBusy(false)
    }
  }

  const selectedExerciseIds = useMemo(
    () => new Set(snapshot?.sessionExercises.map((entry) => entry.exerciseId) ?? []),
    [snapshot?.sessionExercises]
  )
  const exerciseById = useMemo(
    () => new Map(catalog.map((exercise) => [exercise.id, exercise])),
    [catalog]
  )
  const setsBySessionExerciseId = useMemo(() => {
    const map = new Map<string, WorkoutSet[]>()
    for (const set of snapshot?.sets ?? []) {
      const current = map.get(set.sessionExerciseId)
      if (current) current.push(set)
      else map.set(set.sessionExerciseId, [set])
    }
    for (const sets of map.values()) sets.sort((a, b) => a.order - b.order)
    return map
  }, [snapshot?.sets])

  const isActive = session?.status === 'active'
  const elapsed = useElapsedTime(session?.startedAt, Boolean(isActive))

  if (!result || !catalogResult) {
    return (
      <main className="session-page session-page--centered" aria-busy="true">
        <p>記録を読み込んでいます…</p>
      </main>
    )
  }

  if (result.error || catalogResult.error) {
    return (
      <main className="session-page">
        <PageHeader title="記録を開けません" onBack={() => void onBack()} />
        <EmptyState title="記録を読み込めませんでした" description="少し待ってから、もう一度開いてください。" />
      </main>
    )
  }

  if (!session || !snapshot) {
    return (
      <main className="session-page">
        <PageHeader title="記録が見つかりません" onBack={() => void onBack()} />
        <EmptyState title="このトレーニング記録はありません" />
      </main>
    )
  }

  return (
    <main className="session-page">
      <PageHeader
        title={isActive ? 'トレーニング' : formatJapaneseDate(session.startedAt)}
        eyebrow={isActive ? `開始 ${formatTime(session.startedAt)}` : '履歴を編集'}
        onBack={() => void leavePage()}
        compact
      />

      <section className="session-overview" aria-label="セッション情報">
        {isActive ? (
          <div className="session-elapsed" aria-label={`経過時間 ${elapsed}`}>
            <Clock3 aria-hidden="true" size={19} />
            <span><small>経過時間</small><strong>{elapsed}</strong></span>
          </div>
        ) : (
          <dl className="session-facts">
            <div><dt>時間</dt><dd>{formatTime(session.startedAt)}〜{session.endedAt ? formatTime(session.endedAt) : '—'}</dd></div>
            <div><dt>所要時間</dt><dd>{formatDuration(session.startedAt, session.endedAt)}</dd></div>
            <div><dt>内容</dt><dd>{snapshot.sessionExercises.length}種目 / {snapshot.sets.length}セット</dd></div>
          </dl>
        )}
        {isActive && onComplete ? (
          <button
            className="button button--primary session-finish-button"
            type="button"
            disabled={terminalBusy}
            onClick={() => void finishSession()}
          >
            {terminalBusy ? '終了中…' : 'トレーニング終了'}
          </button>
        ) : null}
      </section>

      <section className="session-note" aria-labelledby="session-note-label">
        <label id="session-note-label" htmlFor={`session-note-${session.id}`}>セッションメモ</label>
        <textarea
          id={`session-note-${session.id}`}
          rows={3}
          value={noteDraft}
          placeholder="次回の重量、疲労、フォームなど"
          onChange={(event) => {
            const value = event.target.value
            noteDirtyRef.current = true
            latestNoteRef.current = value
            setNoteDraft(value)
          }}
          onBlur={() => {
            if (noteDirtyRef.current) void enqueueNoteSave(latestNoteRef.current)
          }}
        />
        <small>入力内容は自動保存されます</small>
      </section>

      <div className="session-exercises">
        {snapshot.sessionExercises.length === 0 ? (
          <EmptyState
            title="種目を追加してください"
            description="お気に入りや最近使った種目からすぐ追加できます。"
            compact
          />
        ) : null}

        {snapshot.sessionExercises.map((sessionExercise, index) => {
          const exercise = exerciseById.get(sessionExercise.exerciseId)
          if (!exercise) return null
          const exerciseSets = setsBySessionExerciseId.get(sessionExercise.id) ?? []
          const previousRecord = previousByExerciseId.get(exercise.id)
          return (
            <ExerciseSetEditor
              key={sessionExercise.id}
              exercise={exercise}
              sets={exerciseSets}
              previous={previousRecord ? {
                dateLabel: formatShortDate(previousRecord.session.startedAt),
                sets: previousRecord.sets
              } : undefined}
              unit={unit}
              onCopyPrevious={async () => {
                if (
                  exerciseSets.length > 0
                  && !window.confirm('現在のセットを前回記録で置き換えますか？')
                ) return
                await runMutation('前回記録のコピーに失敗しました', () =>
                  copyPreviousSets(sessionExercise.id)
                )
              }}
              onAddSet={async () => {
                await runMutation('セットの追加に失敗しました', () => addSet(sessionExercise.id))
              }}
              onUpdateSet={async (setId, changes) => {
                await runMutation('セットの保存に失敗しました', () => updateSet(setId, changes))
              }}
              onDuplicateSet={async (setId) => {
                await runMutation('セットの複製に失敗しました', () => duplicateSet(setId))
              }}
              onDeleteSet={async (setId) => {
                if (!isActive && !window.confirm('このセットを履歴から削除しますか？')) return
                await runMutation('セットの削除に失敗しました', () => deleteSet(setId))
              }}
              onMoveSet={async (setId, direction) => {
                await runMutation('セット順の変更に失敗しました', () => moveSet(setId, direction))
              }}
              onMoveExercise={async (direction) => {
                await runMutation('種目順の変更に失敗しました', () =>
                  moveSessionExercise(sessionExercise.id, direction)
                )
              }}
              onRemoveExercise={async () => {
                if (!window.confirm(`${exercise.name}と、このセッション内のセットを削除しますか？`)) return
                await runMutation('種目の削除に失敗しました', () =>
                  removeExerciseFromSession(sessionExercise.id)
                )
              }}
              canMoveExerciseUp={index > 0}
              canMoveExerciseDown={index < snapshot.sessionExercises.length - 1}
            />
          )
        })}
      </div>

      <button className="session-add-exercise" type="button" onClick={() => setPickerOpen(true)}>
        <Plus aria-hidden="true" size={20} /> 種目を追加
      </button>

      <section className="session-danger-zone" aria-label="削除操作">
        <button
          className="button button--danger-plain"
          type="button"
          disabled={terminalBusy}
          onClick={() => void removeWholeSession()}
        >
          <Trash2 aria-hidden="true" size={18} />
          {isActive ? 'このセッションを破棄' : 'この記録を削除'}
        </button>
      </section>

      {pickerOpen ? (
        <Modal title="種目を追加" size="large" onClose={() => setPickerOpen(false)}>
          <ExercisePicker
            exercises={catalog}
            recentExerciseIds={recentExerciseIds}
            selectedExerciseIds={selectedExerciseIds}
            onSelect={addExercise}
            onToggleFavorite={toggleFavorite}
            onError={(message) => onError(message)}
          />
        </Modal>
      ) : null}
    </main>
  )
}
