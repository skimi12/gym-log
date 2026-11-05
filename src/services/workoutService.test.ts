import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDatabase, type GymLogDatabase } from '../db/database'
import type { Exercise, SessionExercise, WorkoutSession, WorkoutSet } from '../types/models'
import {
  copyPreviousSets,
  deleteSession,
  getActiveSession,
  getOrCreateActiveSession,
  getPreviousCompletedRecord
} from './workoutService'

const exercise: Exercise = {
  id: 'exercise-bench',
  name: 'ベンチプレス',
  aliases: [],
  primaryMuscle: 'chest',
  secondaryMuscles: ['triceps'],
  equipment: 'barbell',
  equipmentDetail: 'テスト用',
  loadType: 'weighted',
  isBuiltIn: false,
  isFavorite: false,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

function session(
  id: string,
  startedAt: string,
  status: WorkoutSession['status']
): WorkoutSession {
  return {
    id,
    startedAt,
    endedAt: status === 'completed' ? startedAt : undefined,
    status,
    note: '',
    createdAt: startedAt,
    updatedAt: startedAt
  }
}

function sessionExercise(sessionId: string): SessionExercise {
  return {
    id: `session-exercise-${sessionId}`,
    sessionId,
    exerciseId: exercise.id,
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
}

function workoutSet(sessionId: string, weightKg: number): WorkoutSet {
  return {
    id: `set-${sessionId}`,
    sessionId,
    sessionExerciseId: `session-exercise-${sessionId}`,
    exerciseId: exercise.id,
    order: 0,
    weightKg,
    reps: 8,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

describe('workout persistence services', () => {
  let database: GymLogDatabase

  beforeEach(async () => {
    database = createDatabase(`workout-test-${crypto.randomUUID()}`)
    await database.open()
    await database.exercises.add(exercise)
  })

  afterEach(async () => {
    await database.delete()
  })

  it('restores the active session instead of creating a duplicate', async () => {
    const active = session('active-existing', '2026-08-07T10:00:00.000Z', 'active')
    await database.workoutSessions.add(active)

    const restored = await getOrCreateActiveSession(database)

    expect(restored.id).toBe(active.id)
    expect((await getActiveSession(database))?.id).toBe(active.id)
    expect(await database.workoutSessions.where('status').equals('active').count()).toBe(1)
  })

  it('selects the latest completed record and never uses an active session', async () => {
    const sessions = [
      session('completed-old', '2026-08-01T10:00:00.000Z', 'completed'),
      session('completed-latest', '2026-08-05T10:00:00.000Z', 'completed'),
      session('active-newer', '2026-08-07T10:00:00.000Z', 'active')
    ]
    await database.workoutSessions.bulkAdd(sessions)
    await database.sessionExercises.bulkAdd(sessions.map((row) => sessionExercise(row.id)))
    await database.workoutSets.bulkAdd([
      workoutSet('completed-old', 40),
      workoutSet('completed-latest', 50),
      workoutSet('active-newer', 60)
    ])

    const previous = await getPreviousCompletedRecord(exercise.id, {}, database)

    expect(previous?.session.id).toBe('completed-latest')
    expect(previous?.sets.map((set) => set.weightKg)).toEqual([50])
  })

  it('cascades session deletion to exercises and sets in one transaction', async () => {
    const targetSession = session('delete-me', '2026-08-05T10:00:00.000Z', 'completed')
    const keepSession = session('keep-me', '2026-08-06T10:00:00.000Z', 'completed')
    await database.workoutSessions.bulkAdd([targetSession, keepSession])
    await database.sessionExercises.bulkAdd([
      sessionExercise(targetSession.id),
      sessionExercise(keepSession.id)
    ])
    await database.workoutSets.bulkAdd([
      workoutSet(targetSession.id, 50),
      workoutSet(keepSession.id, 55)
    ])

    await deleteSession(targetSession.id, database)

    expect(await database.workoutSessions.get(targetSession.id)).toBeUndefined()
    expect(await database.sessionExercises.where('sessionId').equals(targetSession.id).count()).toBe(0)
    expect(await database.workoutSets.where('sessionId').equals(targetSession.id).count()).toBe(0)
    expect(await database.workoutSessions.get(keepSession.id)).toBeDefined()
    expect(await database.workoutSets.where('sessionId').equals(keepSession.id).count()).toBe(1)
  })

  it('copies the previous sets as editable rows in the current session', async () => {
    const previous = session('copy-source', '2026-08-05T10:00:00.000Z', 'completed')
    const current = session('copy-target', '2026-08-07T10:00:00.000Z', 'active')
    await database.workoutSessions.bulkAdd([previous, current])
    await database.sessionExercises.bulkAdd([
      sessionExercise(previous.id),
      sessionExercise(current.id)
    ])
    await database.workoutSets.add(workoutSet(previous.id, 52.5))

    const copies = await copyPreviousSets(`session-exercise-${current.id}`, database)

    expect(copies).toHaveLength(1)
    expect(copies[0]).toMatchObject({
      sessionId: current.id,
      sessionExerciseId: `session-exercise-${current.id}`,
      weightKg: 52.5,
      reps: 8
    })
    expect(copies[0].id).not.toBe(`set-${previous.id}`)
  })

  it('never leaves copied sets orphaned when session deletion races a copy', async () => {
    const previous = session('race-source', '2026-08-05T10:00:00.000Z', 'completed')
    const current = session('race-target', '2026-08-07T10:00:00.000Z', 'active')
    await database.workoutSessions.bulkAdd([previous, current])
    await database.sessionExercises.bulkAdd([
      sessionExercise(previous.id),
      sessionExercise(current.id)
    ])
    await database.workoutSets.add(workoutSet(previous.id, 50))

    await Promise.allSettled([
      copyPreviousSets(`session-exercise-${current.id}`, database),
      deleteSession(current.id, database)
    ])

    expect(await database.workoutSessions.get(current.id)).toBeUndefined()
    expect(await database.sessionExercises.where('sessionId').equals(current.id).count()).toBe(0)
    expect(await database.workoutSets.where('sessionId').equals(current.id).count()).toBe(0)
  })
})
