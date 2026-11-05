import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, ChevronDown, Star } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { db } from '../db/database'
import type { AppSettings, Exercise, WorkoutSession } from '../types/models'
import {
  ANALYTICS_METRICS,
  ANALYTICS_PERIOD_LABELS,
  ANALYTICS_PERIODS,
  buildAnalyticsPoints,
  formatMetricValue,
  getMetricDefinition,
  metricValueForDisplay,
  type AnalyticsMetric,
  type AnalyticsPeriod
} from '../utils/analytics'
import { formatShortDate } from '../utils/dates'
import { normalizeSearchText } from '../utils/search'
import './analytics.css'

interface AnalyticsPageProps {
  unit: AppSettings['unit']
  initialExerciseId?: string
  onExerciseChange?: (exerciseId: string) => void
}

const METRIC_SHORT_LABELS: Record<AnalyticsMetric, string> = {
  maxWeight: '最高重量',
  maxReps: '最高回数',
  estimated1RM: '推定1RM',
  volume: 'ボリューム'
}

function exerciseMatches(exercise: Exercise, search: string): boolean {
  const normalized = normalizeSearchText(search)
  if (!normalized) return true
  return [exercise.name, ...exercise.aliases].some((value) => normalizeSearchText(value).includes(normalized))
}

export function AnalyticsPage({ unit, initialExerciseId, onExerciseChange }: AnalyticsPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const exercises = useLiveQuery(
    () => db.exercises.toArray(),
    [],
    []
  )
  const recentExerciseIds = useLiveQuery(async () => {
    const sessions = (await db.workoutSessions.where('status').equals('completed').toArray())
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      .slice(0, 8)
    if (sessions.length === 0) return [] as string[]
    const rows = await db.sessionExercises.where('sessionId').anyOf(sessions.map((session) => session.id)).toArray()
    const sessionOrder = new Map(sessions.map((session, index) => [session.id, index]))
    rows.sort((a, b) => (sessionOrder.get(a.sessionId) ?? 99) - (sessionOrder.get(b.sessionId) ?? 99) || a.order - b.order)
    return [...new Set(rows.map((row) => row.exerciseId))].slice(0, 8)
  }, [], [])

  const favorites = useMemo(
    () => exercises.filter((exercise) => exercise.isFavorite)
      .sort((a, b) => (a.favoriteOrder ?? Number.MAX_SAFE_INTEGER) - (b.favoriteOrder ?? Number.MAX_SAFE_INTEGER)),
    [exercises]
  )
  const recentExercises = useMemo(
    () => recentExerciseIds.map((id) => exercises.find((exercise) => exercise.id === id)).filter((item): item is Exercise => Boolean(item)),
    [exercises, recentExerciseIds]
  )
  const [selectedId, setSelectedId] = useState(initialExerciseId ?? '')
  const [metric, setMetric] = useState<AnalyticsMetric>('maxWeight')
  const [period, setPeriod] = useState<AnalyticsPeriod>('3m')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (initialExerciseId) setSelectedId(initialExerciseId)
  }, [initialExerciseId])

  useEffect(() => {
    if (selectedId || exercises.length === 0) return
    const nextId = favorites[0]?.id ?? recentExercises[0]?.id ?? ''
    setSelectedId(nextId)
    if (nextId) onExerciseChange?.(nextId)
  }, [exercises, favorites, onExerciseChange, recentExercises, selectedId])

  const selectedExercise = exercises.find((exercise) => exercise.id === selectedId)
  const records = useLiveQuery(async () => {
    if (!selectedId) return { sets: [], sessions: [] as WorkoutSession[] }
    const sets = await db.workoutSets.where('exerciseId').equals(selectedId).toArray()
    const sessionIds = [...new Set(sets.map((set) => set.sessionId))]
    const sessions = (await db.workoutSessions.bulkGet(sessionIds)).filter((session): session is WorkoutSession => Boolean(session))
    return { sets, sessions }
  }, [selectedId], { sets: [], sessions: [] })

  const definition = selectedExercise ? getMetricDefinition(selectedExercise.loadType, metric, unit) : undefined
  const points = selectedExercise
    ? buildAnalyticsPoints({
        exerciseId: selectedExercise.id,
        loadType: selectedExercise.loadType,
        metric,
        sessions: records.sessions,
        sets: records.sets,
        period
      })
    : []
  const chartData = points.map((point) => ({
    ...point,
    label: formatShortDate(point.occurredAt),
    displayValue: metricValueForDisplay(point.value, metric, unit)
  }))
  const filteredExercises = exercises.filter((exercise) => exerciseMatches(exercise, search))

  const selectExercise = (exerciseId: string) => {
    setSelectedId(exerciseId)
    onExerciseChange?.(exerciseId)
    setPickerOpen(false)
    setSearch('')
  }

  return (
    <main className="page page--with-tabs analytics-page">
      <header className="page-title-row">
        <div>
          <p className="page-kicker">推移</p>
          <h1 ref={headingRef} tabIndex={-1}>分析</h1>
        </div>
      </header>

      <section aria-labelledby="analytics-exercise-label">
        <label className="field-label" id="analytics-exercise-label">対象種目</label>
        <button className="exercise-select-button" type="button" onClick={() => setPickerOpen((value) => !value)} aria-expanded={pickerOpen}>
          <span>{selectedExercise?.name ?? '種目を選択'}</span>
          <ChevronDown size={19} aria-hidden="true" />
        </button>
        {pickerOpen && (
          <div className="analytics-picker">
            <label className="search-field">
              <span className="sr-only">種目を検索</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="種目名・別名で検索" />
            </label>
            {!search && favorites.length > 0 && (
              <div className="picker-section">
                <strong><Star size={14} fill="currentColor" /> お気に入り</strong>
                <div className="chip-row">
                  {favorites.map((exercise) => <button type="button" key={exercise.id} onClick={() => selectExercise(exercise.id)}>{exercise.name}</button>)}
                </div>
              </div>
            )}
            {!search && recentExercises.length > 0 && (
              <div className="picker-section">
                <strong>最近使った種目</strong>
                <div className="chip-row">
                  {recentExercises.map((exercise) => <button type="button" key={exercise.id} onClick={() => selectExercise(exercise.id)}>{exercise.name}</button>)}
                </div>
              </div>
            )}
            <div className="picker-list">
              {filteredExercises.map((exercise) => (
                <button type="button" key={exercise.id} onClick={() => selectExercise(exercise.id)}>
                  <span>{exercise.name}</span>
                  {exercise.isFavorite && <Star size={15} fill="currentColor" aria-label="お気に入り" />}
                </button>
              ))}
              {filteredExercises.length === 0 && <p className="inline-empty">該当する種目がありません</p>}
            </div>
          </div>
        )}
      </section>

      {!selectedExercise ? (
        <div className="empty-state" role="status">
          <BarChart3 size={28} />
          <strong>分析する種目を選んでください</strong>
        </div>
      ) : (
        <>
          <section className="analytics-controls" aria-label="分析設定">
            <div className="segmented-control segmented-control--metrics" role="group" aria-label="指標">
              {ANALYTICS_METRICS.map((value) => (
                <button type="button" aria-pressed={metric === value} data-active={metric === value || undefined} key={value} onClick={() => setMetric(value)}>
                  {METRIC_SHORT_LABELS[value]}
                </button>
              ))}
            </div>
            <div className="period-control" role="group" aria-label="期間">
              {ANALYTICS_PERIODS.map((value) => (
                <button type="button" aria-pressed={period === value} data-active={period === value || undefined} key={value} onClick={() => setPeriod(value)}>
                  {ANALYTICS_PERIOD_LABELS[value]}
                </button>
              ))}
            </div>
          </section>

          {definition && !definition.supported ? (
            <div className="empty-state" role="status">
              <strong>{definition.unavailableMessage}</strong>
              <span>{selectedExercise.loadType === 'bodyweight' ? '体重を保存しないため、回数のみ分析できます。' : 'この種目では重量の意味が通常種目と異なります。'}</span>
            </div>
          ) : points.length === 0 ? (
            <div className="empty-state" role="status">
              <strong>この期間の記録はありません</strong>
              <span>完了したトレーニングの記録が分析に反映されます。</span>
            </div>
          ) : (
            <section className="chart-section" aria-labelledby="chart-title">
              <div className="chart-heading">
                <div>
                  <p>{definition?.label}</p>
                  <strong id="chart-title">{formatMetricValue(points.at(-1)?.value ?? 0, metric, unit)}</strong>
                </div>
                {metric === 'estimated1RM' && <span>推定値・1〜12回のみ</span>}
                {definition?.lowerIsBetter && <span>補助重量は小さいほど補助が少ない</span>}
              </div>
              <div className="chart-wrap" role="img" aria-label={`${selectedExercise.name}の${definition?.label ?? ''}推移グラフ`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--chart-grid, #dedee3)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={52} domain={['auto', 'auto']} />
                    <Tooltip
                      cursor={{ stroke: 'var(--separator)' }}
                      content={({ active, payload }) => {
                        const item = payload?.[0]?.payload as (typeof chartData)[number] | undefined
                        if (!active || !item) return null
                        return <div className="chart-tooltip"><strong>{formatShortDate(item.occurredAt)}</strong><span>{formatMetricValue(item.value, metric, unit)}</span></div>
                      }}
                    />
                    <Line type="monotone" dataKey="displayValue" stroke="var(--accent, #3468a8)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)' }} activeDot={{ r: 5 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
