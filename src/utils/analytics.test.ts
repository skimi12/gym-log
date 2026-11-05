import { describe, expect, it } from 'vitest'
import type { Exercise, WorkoutSession, WorkoutSet } from '../types/models'
import {
  buildAnalyticsPoints,
  calculateEpley1RM,
  calculateSessionMetric,
  calculateVolume,
  filterByPeriod,
  formatRepresentativeSet,
  formatWorkoutSet,
  getMetricDefinition,
  getPeriodStart,
  getPreviousExerciseRecord,
  summarizeSession,
} from './analytics'

const EXERCISE_ID = 'exercise'

function session(
  id: string,
  startedAt: string,
  status: WorkoutSession['status'] = 'completed',
): WorkoutSession {
  return {
    id,
    startedAt,
    endedAt: status === 'completed' ? startedAt : undefined,
    status,
    note: '',
    createdAt: startedAt,
    updatedAt: startedAt,
  }
}

function workoutSet(
  sessionId: string,
  order: number,
  weightKg: number | undefined,
  reps: number,
  exerciseId = EXERCISE_ID,
): WorkoutSet {
  return {
    id: `${sessionId}-${exerciseId}-${order}`,
    sessionId,
    sessionExerciseId: `${sessionId}-${exerciseId}`,
    exerciseId,
    order,
    weightKg,
    reps,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('Epley estimated 1RM', () => {
  it.each([1, 5, 10, 12])('calculates a %i-rep set', (reps) => {
    expect(calculateEpley1RM(60, reps)).toBeCloseTo(60 * (1 + reps / 30), 10)
  })

  it('does not estimate sets of 13 reps or more', () => {
    expect(calculateEpley1RM(60, 13)).toBeUndefined()
  })
})

describe('session metrics', () => {
  const sets = [workoutSet('one', 1, 50, 10), workoutSet('one', 2, 45, 8)]

  it('sums weighted volume across sets', () => {
    expect(calculateVolume(sets)).toBe(860)
    expect(calculateSessionMetric(sets, 'weighted', 'volume')).toBe(860)
  })

  it('keeps assisted analysis separate from ordinary weight analysis', () => {
    const assistedSets = [workoutSet('one', 1, 30, 10), workoutSet('one', 2, 25, 8)]

    expect(calculateSessionMetric(assistedSets, 'weighted', 'maxWeight')).toBe(30)
    expect(calculateSessionMetric(assistedSets, 'assisted', 'maxWeight')).toBe(25)
    expect(calculateSessionMetric(assistedSets, 'assisted', 'estimated1RM')).toBeUndefined()
    expect(calculateSessionMetric(assistedSets, 'assisted', 'volume')).toBeUndefined()
    expect(getMetricDefinition('assisted', 'maxWeight', 'kg')).toMatchObject({
      label: '補助重量',
      lowerIsBetter: true,
      supported: true,
    })
  })

  it('does not fabricate bodyweight load, 1RM, or volume', () => {
    const bodyweightSets = [workoutSet('one', 1, undefined, 10)]

    expect(calculateSessionMetric(bodyweightSets, 'bodyweight', 'maxWeight')).toBeUndefined()
    expect(calculateSessionMetric(bodyweightSets, 'bodyweight', 'estimated1RM')).toBeUndefined()
    expect(calculateSessionMetric(bodyweightSets, 'bodyweight', 'volume')).toBeUndefined()
    expect(calculateSessionMetric(bodyweightSets, 'bodyweight', 'maxReps')).toBe(10)
  })

  it('uses only additional weight for bodyweight-added weight trend', () => {
    const addedSets = [
      workoutSet('one', 1, undefined, 10),
      workoutSet('one', 2, 10, 6),
    ]

    expect(calculateSessionMetric(addedSets, 'bodyweightAdded', 'maxWeight')).toBe(10)
    expect(calculateSessionMetric(addedSets, 'bodyweightAdded', 'estimated1RM')).toBeUndefined()
    expect(calculateSessionMetric(addedSets, 'bodyweightAdded', 'volume')).toBeUndefined()
  })

  it('summarizes only ordinary weighted volume', () => {
    const completed = {
      ...session('one', '2026-08-07T01:00:00.000Z'),
      endedAt: '2026-08-07T02:30:00.000Z',
    }
    const exercises = [
      { id: EXERCISE_ID, loadType: 'weighted' },
      { id: 'assisted', loadType: 'assisted' },
    ] as Exercise[]
    const allSets = [
      workoutSet('one', 1, 50, 10),
      workoutSet('one', 1, 20, 8, 'assisted'),
    ]

    expect(summarizeSession(completed, exercises, allSets)).toEqual({
      durationMs: 5_400_000,
      durationMinutes: 90,
      exerciseCount: 2,
      setCount: 2,
      totalReps: 18,
      weightedVolumeKg: 500,
    })
  })
})

describe('analytics points', () => {
  it('creates one point per completed session and ignores active sessions', () => {
    const sessions = [
      session('first', '2026-08-01T01:00:00.000Z'),
      session('second', '2026-08-01T10:00:00.000Z'),
      session('active', '2026-08-02T01:00:00.000Z', 'active'),
    ]
    const sets = [
      workoutSet('first', 1, 50, 10),
      workoutSet('first', 2, 55, 5),
      workoutSet('second', 1, 57.5, 5),
      workoutSet('active', 1, 100, 1),
    ]

    const points = buildAnalyticsPoints({
      exerciseId: EXERCISE_ID,
      loadType: 'weighted',
      metric: 'maxWeight',
      sessions,
      sets,
    })

    expect(points).toHaveLength(2)
    expect(points.map((point) => point.sessionId)).toEqual(['first', 'second'])
    expect(points.map((point) => point.value)).toEqual([55, 57.5])
  })

  it('aggregates every weighted metric within each session', () => {
    const sessions = [session('first', '2026-08-01T01:00:00.000Z')]
    const sets = [workoutSet('first', 1, 60, 5), workoutSet('first', 2, 50, 10)]
    const values = (metric: 'maxWeight' | 'maxReps' | 'estimated1RM' | 'volume') =>
      buildAnalyticsPoints({
        exerciseId: EXERCISE_ID,
        loadType: 'weighted',
        metric,
        sessions,
        sets,
      })[0]?.value

    expect(values('maxWeight')).toBe(60)
    expect(values('maxReps')).toBe(10)
    expect(values('estimated1RM')).toBeCloseTo(70, 9)
    expect(values('volume')).toBe(800)
  })

  it('does not emit unsupported bodyweight or assisted points', () => {
    const sessions = [session('first', '2026-08-01T01:00:00.000Z')]
    const sets = [workoutSet('first', 1, 30, 10)]

    expect(
      buildAnalyticsPoints({
        exerciseId: EXERCISE_ID,
        loadType: 'assisted',
        metric: 'estimated1RM',
        sessions,
        sets,
      }),
    ).toEqual([])
    expect(
      buildAnalyticsPoints({
        exerciseId: EXERCISE_ID,
        loadType: 'bodyweight',
        metric: 'volume',
        sessions,
        sets,
      }),
    ).toEqual([])
  })
})

describe('analytics periods', () => {
  it('uses calendar months and clamps month-end correctly', () => {
    const start = getPeriodStart('1m', new Date(2026, 2, 31, 12, 30))
    expect(start?.getFullYear()).toBe(2026)
    expect(start?.getMonth()).toBe(1)
    expect(start?.getDate()).toBe(28)
    expect(start?.getHours()).toBe(12)
  })

  it.each([
    ['1m', ['one-month']],
    ['3m', ['one-month', 'three-months']],
    ['6m', ['one-month', 'three-months', 'six-months']],
    ['1y', ['one-month', 'three-months', 'six-months', 'one-year']],
    ['all', ['one-month', 'three-months', 'six-months', 'one-year', 'older']],
  ] as const)('filters the %s period independently', (period, expected) => {
    const now = new Date(2026, 7, 7, 12)
    const values = [
      { id: 'one-month', at: new Date(2026, 6, 7, 12) },
      { id: 'three-months', at: new Date(2026, 4, 7, 12) },
      { id: 'six-months', at: new Date(2026, 1, 7, 12) },
      { id: 'one-year', at: new Date(2025, 7, 7, 12) },
      { id: 'older', at: new Date(2025, 7, 7, 11, 59) },
    ]

    expect(filterByPeriod(values, period, (value) => value.at, now).map(({ id }) => id)).toEqual(
      expected,
    )
  })
})

describe('previous record and set summaries', () => {
  it('selects the latest completed record, never the active session', () => {
    const sessions = [
      session('older', '2026-08-01T01:00:00.000Z'),
      session('latest', '2026-08-05T01:00:00.000Z'),
      session('active', '2026-08-06T01:00:00.000Z', 'active'),
    ]
    const sets = [
      workoutSet('older', 1, 40, 10),
      workoutSet('latest', 2, 45, 8),
      workoutSet('latest', 1, 50, 6),
      workoutSet('active', 1, 60, 5),
    ]

    const previous = getPreviousExerciseRecord(EXERCISE_ID, sessions, sets)
    expect(previous?.session.id).toBe('latest')
    expect(previous?.sets.map((set) => set.order)).toEqual([1, 2])
  })

  it('formats each load type without inventing a zero-kilogram load', () => {
    expect(formatWorkoutSet({ reps: 10 }, 'bodyweight', 'kg')).toBe('自重 × 10')
    expect(formatWorkoutSet({ reps: 10 }, 'bodyweightAdded', 'kg')).toBe('自重 × 10')
    expect(formatWorkoutSet({ weightKg: 10, reps: 6 }, 'bodyweightAdded', 'kg')).toBe(
      '+10kg × 6',
    )
    expect(formatWorkoutSet({ weightKg: 25, reps: 8 }, 'assisted', 'kg')).toBe(
      '補助25kg × 8',
    )
    expect(
      formatRepresentativeSet(
        [workoutSet('one', 1, 30, 10), workoutSet('one', 2, 25, 8)],
        'assisted',
        'kg',
      ),
    ).toBe('補助25kg × 8')
  })
})
