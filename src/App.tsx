import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { registerSW } from 'virtual:pwa-register'
import { BottomTabBar } from './components/BottomTabBar'
import { UpdatePrompt } from './components/UpdatePrompt'
import { useInstallHint } from './hooks/useInstallHint'
import { useTheme } from './hooks/useTheme'
import { ExerciseDetailPage, type ExerciseHistoryRecord } from './pages/ExerciseDetailPage'
import { ExercisePage } from './pages/ExercisePage'
import { HistoryDetailPage } from './pages/HistoryDetailPage'
import { HistoryPage, type HistoryListItem } from './pages/HistoryPage'
import { HomePage, type HomeFavoriteItem, type HomeRecentSession } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'
import { SummaryPage } from './pages/SummaryPage'
import { WorkoutPage } from './pages/WorkoutPage'
import { db, DEFAULT_SETTINGS, initializeDatabase } from './db'
import {
  archiveCustomExercise,
  createCustomExercise,
  getActiveSession,
  getOrCreateActiveSession,
  getPreviousCompletedRecord,
  getSessionBundle,
  moveFavorite,
  toggleFavorite,
  updateSettings
} from './services'
import type { CustomExerciseInput } from './components/CustomExerciseForm'
import type { AppSettings, AppTab, AppView, Exercise, WorkoutSession } from './types/models'
import { useToast } from './components/Toast'

const AnalyticsPage = lazy(async () => {
  const module = await import('./pages/AnalyticsPage')
  return { default: module.AnalyticsPage }
})

function LoadingScreen() {
  return (
    <main className="startup-screen" aria-live="polite">
      <div className="startup-mark" aria-hidden="true">×</div>
      <strong>筋トレ記録</strong>
      <span>記録を準備しています…</span>
    </main>
  )
}

function DatabaseError({ error }: { error: unknown }) {
  return (
    <main className="fatal-error" role="alert">
      <h1>アプリを開けませんでした</h1>
      <p>Safariの空き容量とサイトデータ設定を確認し、もう一度お試しください。</p>
      <button className="button button--primary" type="button" onClick={() => window.location.reload()}>再読み込み</button>
      {import.meta.env.DEV && <pre>{error instanceof Error ? error.message : String(error)}</pre>}
    </main>
  )
}

interface HomeConnectedProps {
  activeSession?: WorkoutSession
  settings: AppSettings
  installHintVisible: boolean
  onDismissInstallHint: () => void
  onStartWorkout: () => Promise<void>
  onResumeWorkout: (sessionId: string) => void
  onOpenExercise: (exerciseId: string) => void
  onOpenHistory: (sessionId: string) => void
  onOpenSettings: () => void
  onToggleFavorite: (exercise: Exercise) => Promise<void>
  onMoveFavorite: (exercise: Exercise, direction: 'up' | 'down') => Promise<void>
  onError: (message: string) => void
}

function HomeConnected(props: HomeConnectedProps) {
  const data = useLiveQuery(async () => {
    const allExercises = await db.exercises.toArray()
    const favorites = allExercises
      .filter((exercise) => exercise.isActive && exercise.isFavorite)
      .sort((a, b) => (a.favoriteOrder ?? Number.MAX_SAFE_INTEGER) - (b.favoriteOrder ?? Number.MAX_SAFE_INTEGER))
    const favoriteItems: HomeFavoriteItem[] = await Promise.all(favorites.map(async (exercise) => {
      const previous = await getPreviousCompletedRecord(exercise.id)
      return { exercise, lastPerformedAt: previous?.session.startedAt, lastSets: previous?.sets }
    }))
    const sessions = (await db.workoutSessions.where('status').equals('completed').toArray())
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      .slice(0, 5)
    const recentSessions: HomeRecentSession[] = await Promise.all(sessions.map(async (session) => ({
      session,
      exerciseCount: await db.sessionExercises.where('sessionId').equals(session.id).count(),
      setCount: await db.workoutSets.where('sessionId').equals(session.id).count()
    })))
    return { favoriteItems, recentSessions }
  }, [], { favoriteItems: [] as HomeFavoriteItem[], recentSessions: [] as HomeRecentSession[] })

  return (
    <HomePage
      activeSession={props.activeSession}
      favorites={data.favoriteItems}
      recentSessions={data.recentSessions}
      unit={props.settings.unit}
      installHintVisible={props.installHintVisible}
      onDismissInstallHint={props.onDismissInstallHint}
      onStartWorkout={props.onStartWorkout}
      onResumeWorkout={props.onResumeWorkout}
      onOpenExercise={props.onOpenExercise}
      onOpenHistory={props.onOpenHistory}
      onOpenSettings={props.onOpenSettings}
      onToggleFavorite={props.onToggleFavorite}
      onMoveFavorite={props.onMoveFavorite}
      onError={props.onError}
    />
  )
}

function HistoryConnected({ onOpenSession }: { onOpenSession: (sessionId: string) => void }) {
  const [visibleCount, setVisibleCount] = useState(30)
  const data = useLiveQuery(async () => {
    const page = await db.workoutSessions
      .where('[status+startedAt]')
      .between(['completed', Dexie.minKey], ['completed', Dexie.maxKey])
      .reverse()
      .limit(visibleCount + 1)
      .toArray()
    const hasMore = page.length > visibleCount
    const sessions = page.slice(0, visibleCount)
    const sessionIds = sessions.map((session) => session.id)
    if (sessionIds.length === 0) return { items: [] as HistoryListItem[], hasMore: false }

    const [exerciseRows, setRows] = await Promise.all([
      db.sessionExercises.where('sessionId').anyOf(sessionIds).toArray(),
      db.workoutSets.where('sessionId').anyOf(sessionIds).toArray()
    ])
    const exerciseCounts = new Map<string, number>()
    const setCounts = new Map<string, number>()
    for (const row of exerciseRows) {
      exerciseCounts.set(row.sessionId, (exerciseCounts.get(row.sessionId) ?? 0) + 1)
    }
    for (const row of setRows) {
      setCounts.set(row.sessionId, (setCounts.get(row.sessionId) ?? 0) + 1)
    }
    const items = sessions.map((session): HistoryListItem => ({
      session,
      exerciseCount: exerciseCounts.get(session.id) ?? 0,
      setCount: setCounts.get(session.id) ?? 0
    }))
    return { items, hasMore }
  }, [visibleCount], { items: [] as HistoryListItem[], hasMore: false })
  return (
    <HistoryPage
      items={data.items}
      hasMore={data.hasMore}
      onLoadMore={() => setVisibleCount((count) => count + 30)}
      onOpenSession={onOpenSession}
    />
  )
}

function ExerciseDetailConnected({
  exerciseId,
  unit,
  onBack,
  onToggleFavorite,
  onOpenHistory,
  onOpenAnalytics,
  onArchive,
  onError
}: {
  exerciseId: string
  unit: AppSettings['unit']
  onBack: () => void
  onToggleFavorite: (exercise: Exercise) => Promise<void>
  onOpenHistory: (sessionId: string) => void
  onOpenAnalytics: (exerciseId: string) => void
  onArchive: (exercise: Exercise) => Promise<void>
  onError: (message: string) => void
}) {
  const data = useLiveQuery(async () => {
    const exercise = await db.exercises.get(exerciseId)
    if (!exercise) return undefined
    const sets = await db.workoutSets.where('exerciseId').equals(exerciseId).toArray()
    const sessionIds = [...new Set(sets.map((set) => set.sessionId))]
    const sessions = (await db.workoutSessions.bulkGet(sessionIds))
      .filter((session): session is WorkoutSession => Boolean(session && session.status === 'completed'))
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    const records: ExerciseHistoryRecord[] = sessions.map((session) => ({
      session,
      sets: sets.filter((set) => set.sessionId === session.id).sort((a, b) => a.order - b.order)
    }))
    return { exercise, records }
  }, [exerciseId])

  if (!data) return <LoadingScreen />
  return (
    <ExerciseDetailPage
      exercise={data.exercise}
      records={data.records}
      unit={unit}
      onBack={onBack}
      onToggleFavorite={onToggleFavorite}
      onOpenHistory={onOpenHistory}
      onOpenAnalytics={onOpenAnalytics}
      onArchiveCustomExercise={onArchive}
      onError={onError}
    />
  )
}

function SummaryConnected({
  sessionId,
  unit,
  onHome,
  onOpenHistory
}: {
  sessionId: string
  unit: AppSettings['unit']
  onHome: () => void
  onOpenHistory: () => void
}) {
  const data = useLiveQuery(async () => {
    const bundle = await getSessionBundle(sessionId)
    if (!bundle) return undefined
    const ids = [...new Set(bundle.sessionExercises.map((entry) => entry.exerciseId))]
    const exercises = (await db.exercises.bulkGet(ids)).filter((item): item is Exercise => Boolean(item))
    return { bundle, exercises }
  }, [sessionId])
  if (!data) return <LoadingScreen />
  return (
    <SummaryPage
      session={data.bundle.session}
      exercises={data.exercises}
      sets={data.bundle.sets}
      unit={unit}
      onHome={onHome}
      onOpenHistory={onOpenHistory}
    />
  )
}

function ReadyApp() {
  const { showToast } = useToast()
  const [view, setView] = useState<AppView>({ type: 'tab', tab: 'home' })
  const [viewStack, setViewStack] = useState<AppView[]>([])
  const [analyticsExerciseId, setAnalyticsExerciseId] = useState<string>()
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const updateServiceWorker = useRef<((reloadPage?: boolean) => Promise<void>) | undefined>(undefined)

  const settings = useLiveQuery(() => db.settings.get('app'), [], DEFAULT_SETTINGS) ?? DEFAULT_SETTINGS
  const activeSessionQuery = useLiveQuery(() => getActiveSession(), [], null)
  const activeSession = activeSessionQuery ?? undefined
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], [])
  const installHint = useInstallHint(settings.installHintDismissed)
  useTheme(settings.theme)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      const heading = document.querySelector('main h1')
      if (heading instanceof HTMLElement) {
        heading.tabIndex = -1
        heading.focus({ preventScroll: true })
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [view])

  useEffect(() => {
    updateServiceWorker.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setUpdateDismissed(false)
        setNeedRefresh(true)
      },
      onOfflineReady() {
        showToast('オフラインで使える準備ができました', 'success')
      },
      onRegisterError(error) {
        console.error('Service Workerの登録に失敗しました', error)
      }
    })
  }, [showToast])

  const pushView = (next: AppView) => {
    setViewStack((stack) => [...stack, view])
    setView(next)
  }
  const goBack = (fallback: AppView = { type: 'tab', tab: 'home' }) => {
    setViewStack((stack) => {
      const previous = stack.at(-1)
      setView(previous ?? fallback)
      return stack.slice(0, -1)
    })
  }
  const goToTab = (tab: AppTab) => {
    setViewStack([])
    setView({ type: 'tab', tab })
  }
  const showError = (message: string, error?: unknown) => {
    if (error) console.error(message, error)
    showToast(message || '保存に失敗しました', 'error')
  }

  const safeToggleFavorite = async (exercise: Exercise) => {
    try { await toggleFavorite(exercise.id) } catch (error) { showError('お気に入りの保存に失敗しました', error) }
  }
  const safeMoveFavorite = async (exercise: Exercise, direction: 'up' | 'down') => {
    try { await moveFavorite(exercise.id, direction) } catch (error) { showError('お気に入り順の保存に失敗しました', error) }
  }
  const safeArchive = async (exercise: Exercise) => {
    await archiveCustomExercise(exercise.id)
  }
  const safeCreate = async (input: CustomExerciseInput) => {
    await createCustomExercise(input)
    showToast('種目を追加しました', 'success')
  }
  const startWorkout = async () => {
    const session = await getOrCreateActiveSession()
    pushView({ type: 'workout', sessionId: session.id })
  }
  const dismissInstallHint = async () => {
    installHint.hide()
    try { await updateSettings({ installHintDismissed: true }) } catch (error) { showError('設定の保存に失敗しました', error) }
  }
  const openAnalytics = (exerciseId: string) => {
    setAnalyticsExerciseId(exerciseId)
    goToTab('analytics')
  }

  let content
  if (view.type === 'workout') {
    content = (
      <WorkoutPage
        sessionId={view.sessionId}
        unit={settings.unit}
        onBack={() => goBack()}
        onCompleted={(sessionId) => setView({ type: 'summary', sessionId })}
        onDeleted={() => goToTab('home')}
        onError={showError}
      />
    )
  } else if (view.type === 'historyDetail') {
    content = (
      <HistoryDetailPage
        sessionId={view.sessionId}
        unit={settings.unit}
        onBack={() => goBack({ type: 'tab', tab: 'history' })}
        onDeleted={() => goToTab('history')}
        onOpenExercise={(exerciseId) => pushView({ type: 'exerciseDetail', exerciseId })}
        onError={showError}
      />
    )
  } else if (view.type === 'exerciseDetail') {
    content = (
      <ExerciseDetailConnected
        exerciseId={view.exerciseId}
        unit={settings.unit}
        onBack={() => goBack({ type: 'tab', tab: 'exercises' })}
        onToggleFavorite={safeToggleFavorite}
        onOpenHistory={(sessionId) => pushView({ type: 'historyDetail', sessionId })}
        onOpenAnalytics={openAnalytics}
        onArchive={safeArchive}
        onError={showError}
      />
    )
  } else if (view.type === 'settings') {
    content = (
      <SettingsPage
        settings={settings}
        onBack={() => goBack()}
        onChangeUnit={async (unit) => { await updateSettings({ unit }) }}
        onChangeTheme={async (theme) => { await updateSettings({ theme }) }}
        onError={showError}
      />
    )
  } else if (view.type === 'summary') {
    content = (
      <SummaryConnected
        sessionId={view.sessionId}
        unit={settings.unit}
        onHome={() => goToTab('home')}
        onOpenHistory={() => pushView({ type: 'historyDetail', sessionId: view.sessionId })}
      />
    )
  } else if (view.tab === 'home') {
    content = (
      <HomeConnected
        activeSession={activeSession}
        settings={settings}
        installHintVisible={installHint.visible}
        onDismissInstallHint={() => void dismissInstallHint()}
        onStartWorkout={startWorkout}
        onResumeWorkout={(sessionId) => pushView({ type: 'workout', sessionId })}
        onOpenExercise={(exerciseId) => pushView({ type: 'exerciseDetail', exerciseId })}
        onOpenHistory={(sessionId) => pushView({ type: 'historyDetail', sessionId })}
        onOpenSettings={() => pushView({ type: 'settings' })}
        onToggleFavorite={safeToggleFavorite}
        onMoveFavorite={safeMoveFavorite}
        onError={showError}
      />
    )
  } else if (view.tab === 'history') {
    content = <HistoryConnected onOpenSession={(sessionId) => pushView({ type: 'historyDetail', sessionId })} />
  } else if (view.tab === 'exercises') {
    content = (
      <ExercisePage
        exercises={exercises}
        onOpenExercise={(exerciseId) => pushView({ type: 'exerciseDetail', exerciseId })}
        onToggleFavorite={safeToggleFavorite}
        onMoveFavorite={safeMoveFavorite}
        onCreateExercise={safeCreate}
        onArchiveCustomExercise={safeArchive}
        onError={showError}
      />
    )
  } else {
    content = (
      <Suspense fallback={<LoadingScreen />}>
        <AnalyticsPage unit={settings.unit} initialExerciseId={analyticsExerciseId} onExerciseChange={setAnalyticsExerciseId} />
      </Suspense>
    )
  }

  const tabView = view.type === 'tab' ? view.tab : undefined
  return (
    <div className="app-shell">
      {content}
      {tabView && <BottomTabBar activeTab={tabView} onChange={goToTab} />}
      <UpdatePrompt
        visible={needRefresh && !updateDismissed}
        hasActiveSession={activeSessionQuery === null || Boolean(activeSession)}
        onDismiss={() => setUpdateDismissed(true)}
        onUpdate={() => void updateServiceWorker.current?.(true)}
      />
    </div>
  )
}

export default function App() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>()

  useEffect(() => {
    initializeDatabase()
      .then(() => setState('ready'))
      .catch((reason: unknown) => {
        console.error('IndexedDBの初期化に失敗しました', reason)
        setError(reason)
        setState('error')
      })
  }, [])

  if (state === 'loading') return <LoadingScreen />
  if (state === 'error') return <DatabaseError error={error} />
  return <ReadyApp />
}
