import type { Exercise, LoadType, WorkoutSession, WorkoutSet } from '../types/models'
import { durationMilliseconds, toLocalDateKey } from './dates'
import {
  formatWeight,
  roundDecimal,
  toDisplayWeight,
  type WeightUnit,
} from './units'

export const ANALYTICS_METRICS = [
  'maxWeight',
  'maxReps',
  'estimated1RM',
  'volume',
] as const

export type AnalyticsMetric = (typeof ANALYTICS_METRICS)[number]

export const ANALYTICS_PERIODS = ['1m', '3m', '6m', '1y', 'all'] as const
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number]

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '1m': '1か月',
  '3m': '3か月',
  '6m': '6か月',
  '1y': '1年',
  all: '全期間',
}

export interface MetricDefinition {
  metric: AnalyticsMetric
  label: string
  valueUnit: string
  supported: boolean
  lowerIsBetter: boolean
  unavailableMessage?: string
}

const UNSUPPORTED_MESSAGE = 'この種目タイプでは算出しません'

export function getMetricDefinition(
  loadType: LoadType,
  metric: AnalyticsMetric,
  unit: WeightUnit,
): MetricDefinition {
  const weightUnit = unit
  const volumeUnit = `${unit}・reps`

  if (metric === 'maxReps') {
    return {
      metric,
      label: '最高回数',
      valueUnit: '回',
      supported: true,
      lowerIsBetter: false,
    }
  }

  if (loadType === 'weighted') {
    const definitions: Record<Exclude<AnalyticsMetric, 'maxReps'>, MetricDefinition> = {
      maxWeight: {
        metric,
        label: '最高重量',
        valueUnit: weightUnit,
        supported: true,
        lowerIsBetter: false,
      },
      estimated1RM: {
        metric,
        label: '推定1RM',
        valueUnit: weightUnit,
        supported: true,
        lowerIsBetter: false,
      },
      volume: {
        metric,
        label: 'ボリューム',
        valueUnit: volumeUnit,
        supported: true,
        lowerIsBetter: false,
      },
    }
    return definitions[metric]
  }

  if (metric === 'maxWeight' && loadType === 'bodyweightAdded') {
    return {
      metric,
      label: '追加重量',
      valueUnit: weightUnit,
      supported: true,
      lowerIsBetter: false,
    }
  }

  if (metric === 'maxWeight' && loadType === 'assisted') {
    return {
      metric,
      label: '補助重量',
      valueUnit: weightUnit,
      supported: true,
      lowerIsBetter: true,
    }
  }

  return {
    metric,
    label:
      metric === 'maxWeight'
        ? '最高重量'
        : metric === 'estimated1RM'
          ? '推定1RM'
          : 'ボリューム',
    valueUnit: metric === 'volume' ? volumeUnit : weightUnit,
    supported: false,
    lowerIsBetter: false,
    unavailableMessage: UNSUPPORTED_MESSAGE,
  }
}

export function isMetricSupported(loadType: LoadType, metric: AnalyticsMetric): boolean {
  return getMetricDefinition(loadType, metric, 'kg').supported
}

/** Epley estimate. Sets above 12 reps are intentionally outside the model. */
export function calculateEpley1RM(weight: number, reps: number): number | undefined {
  if (!Number.isFinite(weight) || weight <= 0) return undefined
  if (!Number.isInteger(reps) || reps < 1 || reps > 12) return undefined
  return weight * (1 + reps / 30)
}

export const calculateEstimated1RM = calculateEpley1RM

type SetNumbers = Pick<WorkoutSet, 'weightKg' | 'reps'>

function isPositiveFinite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0
}

function isRecordedSet(set: SetNumbers): boolean {
  return Number.isFinite(set.reps) && set.reps > 0
}

export function calculateVolume(sets: readonly SetNumbers[]): number {
  return sets.reduce((total, set) => {
    if (!isPositiveFinite(set.weightKg) || !isRecordedSet(set)) return total
    return total + set.weightKg * set.reps
  }, 0)
}

export const calculateSessionVolume = calculateVolume

export interface SessionSummary {
  durationMs: number
  durationMinutes: number
  exerciseCount: number
  setCount: number
  totalReps: number
  /** Only ordinary weighted exercises are included; other load types are incomparable. */
  weightedVolumeKg: number
}

export function summarizeSession(
  session: WorkoutSession,
  exercises: readonly Exercise[],
  sets: readonly WorkoutSet[],
): SessionSummary {
  const sessionSets = sets.filter((set) => set.sessionId === session.id)
  const loadTypeByExerciseId = new Map(
    exercises.map((exercise) => [exercise.id, exercise.loadType] as const),
  )
  const durationMs = durationMilliseconds(
    session.startedAt,
    session.endedAt ?? session.startedAt,
  )

  return {
    durationMs,
    durationMinutes: Math.floor(durationMs / 60_000),
    exerciseCount: exercises.length,
    setCount: sessionSets.length,
    totalReps: sessionSets.reduce(
      (total, set) =>
        total + (Number.isFinite(set.reps) && set.reps > 0 ? set.reps : 0),
      0,
    ),
    weightedVolumeKg: sessionSets.reduce((total, set) => {
      if (loadTypeByExerciseId.get(set.exerciseId) !== 'weighted') return total
      if (!isPositiveFinite(set.weightKg) || !isRecordedSet(set)) return total
      return total + set.weightKg * set.reps
    }, 0),
  }
}

export function calculateMaxWeight(sets: readonly SetNumbers[]): number | undefined {
  const weights = sets
    .filter(isRecordedSet)
    .map((set) => set.weightKg)
    .filter(isPositiveFinite)
  return weights.length > 0 ? Math.max(...weights) : undefined
}

export function calculateMinimumAssistance(sets: readonly SetNumbers[]): number | undefined {
  const assistance = sets
    .filter(isRecordedSet)
    .map((set) => set.weightKg)
    .filter((weight): weight is number =>
      weight !== undefined && Number.isFinite(weight) && weight >= 0,
    )
  return assistance.length > 0 ? Math.min(...assistance) : undefined
}

export function calculateMaxReps(sets: readonly SetNumbers[]): number | undefined {
  const reps = sets.filter(isRecordedSet).map((set) => set.reps)
  return reps.length > 0 ? Math.max(...reps) : undefined
}

export function calculateSessionMetric(
  sets: readonly SetNumbers[],
  loadType: LoadType,
  metric: AnalyticsMetric,
): number | undefined {
  const recordedSets = sets.filter(isRecordedSet)
  if (recordedSets.length === 0) return undefined

  if (metric === 'maxReps') return calculateMaxReps(recordedSets)

  if (loadType === 'bodyweight') return undefined

  if (loadType === 'bodyweightAdded') {
    if (metric !== 'maxWeight') return undefined
    return Math.max(
      ...recordedSets.map((set) =>
        set.weightKg !== undefined && Number.isFinite(set.weightKg)
          ? Math.max(0, set.weightKg)
          : 0,
      ),
    )
  }

  if (loadType === 'assisted') {
    return metric === 'maxWeight' ? calculateMinimumAssistance(recordedSets) : undefined
  }

  if (metric === 'maxWeight') return calculateMaxWeight(recordedSets)

  if (metric === 'estimated1RM') {
    const estimates = recordedSets
      .map((set) =>
        set.weightKg === undefined
          ? undefined
          : calculateEpley1RM(set.weightKg, set.reps),
      )
      .filter((estimate): estimate is number => estimate !== undefined)
    return estimates.length > 0 ? Math.max(...estimates) : undefined
  }

  const hasWeightedSet = recordedSets.some((set) => isPositiveFinite(set.weightKg))
  return hasWeightedSet ? calculateVolume(recordedSets) : undefined
}

export interface AnalyticsPoint {
  sessionId: string
  occurredAt: string
  /** Local-calendar key for chart labels; sessions on the same date remain separate. */
  date: string
  /** Canonical kg, kg・reps, or reps depending on the selected metric. */
  value: number
}

export interface BuildAnalyticsPointsInput {
  exerciseId: string
  loadType: LoadType
  metric: AnalyticsMetric
  sessions: readonly WorkoutSession[]
  sets: readonly WorkoutSet[]
  period?: AnalyticsPeriod
  now?: Date
}

export function buildAnalyticsPoints({
  exerciseId,
  loadType,
  metric,
  sessions,
  sets,
  period = 'all',
  now = new Date(),
}: BuildAnalyticsPointsInput): AnalyticsPoint[] {
  if (!isMetricSupported(loadType, metric)) return []

  const uniqueCompletedSessions = new Map<string, WorkoutSession>()
  for (const session of sessions) {
    if (session.status === 'completed') uniqueCompletedSessions.set(session.id, session)
  }

  const setsBySessionId = new Map<string, WorkoutSet[]>()
  for (const set of sets) {
    if (set.exerciseId !== exerciseId) continue
    const sessionSets = setsBySessionId.get(set.sessionId)
    if (sessionSets) sessionSets.push(set)
    else setsBySessionId.set(set.sessionId, [set])
  }

  return filterByPeriod(
    [...uniqueCompletedSessions.values()],
    period,
    (session) => session.startedAt,
    now,
  )
    .map((session): AnalyticsPoint | undefined => {
      const sessionSets = setsBySessionId.get(session.id) ?? []
      const value = calculateSessionMetric(sessionSets, loadType, metric)
      if (value === undefined) return undefined

      return {
        sessionId: session.id,
        occurredAt: session.startedAt,
        date: toLocalDateKey(session.startedAt),
        value,
      }
    })
    .filter((point): point is AnalyticsPoint => point !== undefined)
    .sort((a, b) => {
      const chronological = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
      return chronological || a.sessionId.localeCompare(b.sessionId)
    })
}

function subtractCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime())
  const targetMonthIndex = result.getMonth() - months
  const targetYear = result.getFullYear() + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12
  const targetDay = Math.min(
    result.getDate(),
    new Date(targetYear, targetMonth + 1, 0).getDate(),
  )

  result.setDate(1)
  result.setFullYear(targetYear, targetMonth, targetDay)
  return result
}

export function getPeriodStart(
  period: AnalyticsPeriod,
  now: Date = new Date(),
): Date | undefined {
  if (period === 'all') return undefined
  const months = period === '1m' ? 1 : period === '3m' ? 3 : period === '6m' ? 6 : 12
  return subtractCalendarMonths(now, months)
}

export function filterByPeriod<T>(
  items: readonly T[],
  period: AnalyticsPeriod,
  getDate: (item: T) => string | Date,
  now: Date = new Date(),
): T[] {
  const start = getPeriodStart(period, now)?.getTime()

  return items.filter((item) => {
    const timestamp = new Date(getDate(item)).getTime()
    if (!Number.isFinite(timestamp)) return false
    return start === undefined || timestamp >= start
  })
}

export function metricValueForDisplay(
  value: number,
  metric: AnalyticsMetric,
  unit: WeightUnit,
): number {
  return metric === 'maxReps' ? value : toDisplayWeight(value, unit)
}

export function formatMetricValue(
  value: number,
  metric: AnalyticsMetric,
  unit: WeightUnit,
): string {
  const displayValue = metricValueForDisplay(value, metric, unit)
  if (metric === 'maxReps') return `${Math.round(displayValue)}回`
  if (metric === 'volume') return `${roundDecimal(displayValue, 1)}${unit}・reps`
  return `${roundDecimal(displayValue, 1)}${unit}`
}

export function formatWorkoutSet(
  set: SetNumbers,
  loadType: LoadType,
  unit: WeightUnit,
): string {
  const reps = Number.isFinite(set.reps) ? set.reps : 0

  if (loadType === 'bodyweight') return `自重 × ${reps}`

  if (loadType === 'bodyweightAdded') {
    return set.weightKg === undefined || set.weightKg <= 0
      ? `自重 × ${reps}`
      : `+${formatWeight(set.weightKg, unit)} × ${reps}`
  }

  if (loadType === 'assisted') {
    return set.weightKg === undefined
      ? `補助— × ${reps}`
      : `補助${formatWeight(set.weightKg, unit)} × ${reps}`
  }

  return set.weightKg === undefined
    ? `— × ${reps}`
    : `${formatWeight(set.weightKg, unit)} × ${reps}`
}

function selectRepresentativeSet(
  sets: readonly SetNumbers[],
  loadType: LoadType,
): SetNumbers | undefined {
  const candidates = sets.filter(isRecordedSet)
  if (candidates.length === 0) return undefined

  if (loadType === 'bodyweight') {
    return candidates.reduce((best, current) => (current.reps > best.reps ? current : best))
  }

  if (loadType === 'assisted') {
    const withAssistance = candidates.filter(
      (set) => set.weightKg !== undefined && Number.isFinite(set.weightKg),
    )
    if (withAssistance.length === 0) return candidates[0]
    return withAssistance.reduce((best, current) => {
      const bestWeight = best.weightKg ?? Number.POSITIVE_INFINITY
      const currentWeight = current.weightKg ?? Number.POSITIVE_INFINITY
      if (currentWeight < bestWeight) return current
      if (currentWeight === bestWeight && current.reps > best.reps) return current
      return best
    })
  }

  return candidates.reduce((best, current) => {
    const bestWeight = best.weightKg ?? 0
    const currentWeight = current.weightKg ?? 0
    if (currentWeight > bestWeight) return current
    if (currentWeight === bestWeight && current.reps > best.reps) return current
    return best
  })
}

export function formatRepresentativeSet(
  sets: readonly SetNumbers[],
  loadType: LoadType,
  unit: WeightUnit,
): string {
  const representative = selectRepresentativeSet(sets, loadType)
  return representative ? formatWorkoutSet(representative, loadType, unit) : '—'
}

export interface PreviousExerciseRecord {
  session: WorkoutSession
  sets: WorkoutSet[]
}

export interface PreviousExerciseRecordOptions {
  excludeSessionId?: string
  before?: string | Date
}

export function getPreviousExerciseRecord(
  exerciseId: string,
  sessions: readonly WorkoutSession[],
  sets: readonly WorkoutSet[],
  options: PreviousExerciseRecordOptions = {},
): PreviousExerciseRecord | undefined {
  const beforeTimestamp = options.before ? new Date(options.before).getTime() : undefined
  const sessionIdsWithExercise = new Set(
    sets.filter((set) => set.exerciseId === exerciseId).map((set) => set.sessionId),
  )

  const session = sessions
    .filter((candidate) => {
      if (candidate.status !== 'completed') return false
      if (candidate.id === options.excludeSessionId) return false
      if (!sessionIdsWithExercise.has(candidate.id)) return false
      if (beforeTimestamp === undefined) return true
      return new Date(candidate.startedAt).getTime() < beforeTimestamp
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]

  if (!session) return undefined

  return {
    session,
    sets: sets
      .filter((set) => set.sessionId === session.id && set.exerciseId === exerciseId)
      .sort((a, b) => a.order - b.order),
  }
}

export function findPreviousCompletedSession(
  exerciseId: string,
  sessions: readonly WorkoutSession[],
  sets: readonly WorkoutSet[],
  options?: PreviousExerciseRecordOptions,
): WorkoutSession | undefined {
  return getPreviousExerciseRecord(exerciseId, sessions, sets, options)?.session
}
