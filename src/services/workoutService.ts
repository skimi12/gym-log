import type {
  LoadType,
  SessionBundle,
  SessionExercise,
  WorkoutSession,
  WorkoutSet
} from '../types/models'
import { createId } from '../types/models'
import { db, type GymLogDatabase } from '../db/database'
export { initializeDatabase } from '../db/initialize'

export type MoveDirection = 'up' | 'down'

export interface SetValues {
  weightKg?: number
  reps: number
}

export interface PreviousRecordOptions {
  excludeSessionId?: string
  beforeStartedAt?: string
}

export interface PreviousCompletedRecord {
  session: WorkoutSession
  sessionExercise: SessionExercise
  sets: WorkoutSet[]
}

function nowIso(): string {
  return new Date().toISOString()
}

function validateReps(reps: number): number {
  if (!Number.isFinite(reps) || reps < 0) throw new Error('Reps must be a non-negative number')
  return Math.trunc(reps)
}

function normalizeWeight(weightKg: number | undefined, loadType: LoadType): number | undefined {
  if (loadType === 'bodyweight') return undefined
  if (weightKg === undefined) return undefined
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    throw new Error('Weight must be a non-negative number')
  }
  if (loadType === 'bodyweightAdded' && weightKg === 0) return undefined
  return weightKg
}

async function requireSession(
  sessionId: string,
  target: GymLogDatabase
): Promise<WorkoutSession> {
  const session = await target.workoutSessions.get(sessionId)
  if (!session) throw new Error('Session not found')
  return session
}

async function requireSessionExercise(
  sessionExerciseId: string,
  target: GymLogDatabase
): Promise<SessionExercise> {
  const sessionExercise = await target.sessionExercises.get(sessionExerciseId)
  if (!sessionExercise) throw new Error('Session exercise not found')
  return sessionExercise
}

async function compactSessionExerciseOrders(
  sessionId: string,
  target: GymLogDatabase
): Promise<void> {
  const rows = await target.sessionExercises
    .where('[sessionId+order]')
    .between([sessionId, 0], [sessionId, Number.MAX_SAFE_INTEGER], true, true)
    .toArray()

  const updates = rows
    .sort((a, b) => a.order - b.order)
    .map((row, index) => ({ ...row, order: index }))
    .filter((row, index) => rows[index].order !== row.order)
  if (updates.length) await target.sessionExercises.bulkPut(updates)
}

async function compactSetOrders(
  sessionExerciseId: string,
  target: GymLogDatabase
): Promise<void> {
  const rows = await target.workoutSets
    .where('[sessionExerciseId+order]')
    .between([sessionExerciseId, 0], [sessionExerciseId, Number.MAX_SAFE_INTEGER], true, true)
    .toArray()

  const updates = rows
    .sort((a, b) => a.order - b.order)
    .map((row, index) => ({ ...row, order: index, updatedAt: nowIso() }))
    .filter((row, index) => rows[index].order !== row.order)
  if (updates.length) await target.workoutSets.bulkPut(updates)
}

export async function getActiveSession(
  target: GymLogDatabase = db
): Promise<WorkoutSession | undefined> {
  const active = await target.workoutSessions.where('status').equals('active').toArray()
  return active.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
}

/** Returns the current session and atomically avoids creating a duplicate one. */
export async function getOrCreateActiveSession(
  target: GymLogDatabase = db
): Promise<WorkoutSession> {
  return target.transaction('rw', target.workoutSessions, async () => {
    const active = await target.workoutSessions.where('status').equals('active').toArray()
    const existing = active.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
    if (existing) return existing

    const timestamp = nowIso()
    const session: WorkoutSession = {
      id: createId(),
      startedAt: timestamp,
      status: 'active',
      note: '',
      createdAt: timestamp,
      updatedAt: timestamp
    }
    await target.workoutSessions.add(session)
    return session
  })
}

export async function getSessionBundle(
  sessionId: string,
  target: GymLogDatabase = db
): Promise<SessionBundle | undefined> {
  const session = await target.workoutSessions.get(sessionId)
  if (!session) return undefined

  const [sessionExercises, sets] = await Promise.all([
    target.sessionExercises.where('sessionId').equals(sessionId).sortBy('order'),
    target.workoutSets.where('sessionId').equals(sessionId).toArray()
  ])

  return {
    session,
    sessionExercises,
    sets: sets.sort((a, b) => {
      const exerciseOrderA =
        sessionExercises.find((entry) => entry.id === a.sessionExerciseId)?.order ?? 0
      const exerciseOrderB =
        sessionExercises.find((entry) => entry.id === b.sessionExerciseId)?.order ?? 0
      return exerciseOrderA - exerciseOrderB || a.order - b.order
    })
  }
}

export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
  target: GymLogDatabase = db
): Promise<SessionExercise> {
  return target.transaction(
    'rw',
    target.workoutSessions,
    target.exercises,
    target.sessionExercises,
    async () => {
      await requireSession(sessionId, target)
      const exercise = await target.exercises.get(exerciseId)
      if (!exercise || !exercise.isActive) throw new Error('Exercise not found')

      const existing = await target.sessionExercises
        .where('[sessionId+exerciseId]')
        .equals([sessionId, exerciseId])
        .first()
      if (existing) return existing

      const count = await target.sessionExercises.where('sessionId').equals(sessionId).count()
      const sessionExercise: SessionExercise = {
        id: createId(),
        sessionId,
        exerciseId,
        order: count,
        createdAt: nowIso()
      }
      await target.sessionExercises.add(sessionExercise)
      return sessionExercise
    }
  )
}

export async function removeExerciseFromSession(
  sessionExerciseId: string,
  target: GymLogDatabase = db
): Promise<void> {
  await target.transaction('rw', target.sessionExercises, target.workoutSets, async () => {
    const sessionExercise = await requireSessionExercise(sessionExerciseId, target)
    await target.workoutSets.where('sessionExerciseId').equals(sessionExerciseId).delete()
    await target.sessionExercises.delete(sessionExerciseId)
    await compactSessionExerciseOrders(sessionExercise.sessionId, target)
  })
}

export async function moveSessionExercise(
  sessionExerciseId: string,
  direction: MoveDirection,
  target: GymLogDatabase = db
): Promise<SessionExercise[]> {
  return target.transaction('rw', target.sessionExercises, async () => {
    const current = await requireSessionExercise(sessionExerciseId, target)
    const rows = await target.sessionExercises.where('sessionId').equals(current.sessionId).sortBy('order')
    const index = rows.findIndex((row) => row.id === current.id)
    const destination = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || destination < 0 || destination >= rows.length) return rows

    const other = rows[destination]
    const currentOrder = current.order
    current.order = other.order
    other.order = currentOrder
    await target.sessionExercises.bulkPut([current, other])
    return rows.sort((a, b) => a.order - b.order)
  })
}

export async function addSet(
  sessionExerciseId: string,
  values?: Partial<SetValues>,
  target: GymLogDatabase = db
): Promise<WorkoutSet> {
  return target.transaction(
    'rw',
    target.sessionExercises,
    target.exercises,
    target.workoutSets,
    async () => {
      const sessionExercise = await requireSessionExercise(sessionExerciseId, target)
      const exercise = await target.exercises.get(sessionExercise.exerciseId)
      if (!exercise) throw new Error('Exercise not found')
      const existing = await target.workoutSets
        .where('sessionExerciseId')
        .equals(sessionExerciseId)
        .sortBy('order')
      const previous = existing.at(-1)
      const timestamp = nowIso()
      const workoutSet: WorkoutSet = {
        id: createId(),
        sessionId: sessionExercise.sessionId,
        sessionExerciseId,
        exerciseId: sessionExercise.exerciseId,
        order: existing.length,
        weightKg: normalizeWeight(values?.weightKg ?? previous?.weightKg, exercise.loadType),
        reps: validateReps(values?.reps ?? previous?.reps ?? 0),
        createdAt: timestamp,
        updatedAt: timestamp
      }
      await target.workoutSets.add(workoutSet)
      return workoutSet
    }
  )
}

export async function updateSet(
  setId: string,
  changes: Partial<SetValues>,
  target: GymLogDatabase = db
): Promise<WorkoutSet> {
  return target.transaction('rw', target.workoutSets, target.exercises, async () => {
    const current = await target.workoutSets.get(setId)
    if (!current) throw new Error('Set not found')
    const exercise = await target.exercises.get(current.exerciseId)
    if (!exercise) throw new Error('Exercise not found')

    const updated: WorkoutSet = {
      ...current,
      weightKg:
        'weightKg' in changes
          ? normalizeWeight(changes.weightKg, exercise.loadType)
          : current.weightKg,
      reps: changes.reps === undefined ? current.reps : validateReps(changes.reps),
      updatedAt: nowIso()
    }
    await target.workoutSets.put(updated)
    return updated
  })
}

export async function deleteSet(
  setId: string,
  target: GymLogDatabase = db
): Promise<void> {
  await target.transaction('rw', target.workoutSets, async () => {
    const current = await target.workoutSets.get(setId)
    if (!current) return
    await target.workoutSets.delete(setId)
    await compactSetOrders(current.sessionExerciseId, target)
  })
}

export async function duplicateSet(
  setId: string,
  target: GymLogDatabase = db
): Promise<WorkoutSet> {
  return target.transaction('rw', target.workoutSets, async () => {
    const source = await target.workoutSets.get(setId)
    if (!source) throw new Error('Set not found')
    const siblings = await target.workoutSets
      .where('sessionExerciseId')
      .equals(source.sessionExerciseId)
      .sortBy('order')
    const timestamp = nowIso()
    const shifted = siblings
      .filter((row) => row.order > source.order)
      .map((row) => ({ ...row, order: row.order + 1, updatedAt: timestamp }))
    if (shifted.length) await target.workoutSets.bulkPut(shifted)

    const copy: WorkoutSet = {
      ...source,
      id: createId(),
      order: source.order + 1,
      createdAt: timestamp,
      updatedAt: timestamp
    }
    await target.workoutSets.add(copy)
    return copy
  })
}

export async function moveSet(
  setId: string,
  direction: MoveDirection,
  target: GymLogDatabase = db
): Promise<WorkoutSet[]> {
  return target.transaction('rw', target.workoutSets, async () => {
    const current = await target.workoutSets.get(setId)
    if (!current) throw new Error('Set not found')
    const rows = await target.workoutSets
      .where('sessionExerciseId')
      .equals(current.sessionExerciseId)
      .sortBy('order')
    const index = rows.findIndex((row) => row.id === current.id)
    const destination = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || destination < 0 || destination >= rows.length) return rows

    const other = rows[destination]
    const currentOrder = current.order
    const timestamp = nowIso()
    current.order = other.order
    current.updatedAt = timestamp
    other.order = currentOrder
    other.updatedAt = timestamp
    await target.workoutSets.bulkPut([current, other])
    return rows.sort((a, b) => a.order - b.order)
  })
}

export async function getPreviousCompletedRecord(
  exerciseId: string,
  options: PreviousRecordOptions = {},
  target: GymLogDatabase = db
): Promise<PreviousCompletedRecord | undefined> {
  const exerciseRows = await target.sessionExercises
    .where('exerciseId')
    .equals(exerciseId)
    .toArray()
  if (exerciseRows.length === 0) return undefined

  const rowsBySessionId = new Map(exerciseRows.map((row) => [row.sessionId, row]))
  const candidates = (await target.workoutSessions.bulkGet([...rowsBySessionId.keys()]))
    .filter((session): session is WorkoutSession => Boolean(session))
    .filter((session) => session.status === 'completed')
    .filter((session) => session.id !== options.excludeSessionId)
    .filter((session) => !options.beforeStartedAt || session.startedAt < options.beforeStartedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  for (const session of candidates) {
    const sessionExercise = rowsBySessionId.get(session.id)
    if (!sessionExercise) continue
    const sets = await target.workoutSets
      .where('sessionExerciseId')
      .equals(sessionExercise.id)
      .sortBy('order')
    if (sets.length) return { session, sessionExercise, sets }
  }
  return undefined
}

/** Replaces current rows. The UI owns the confirmation when rows already exist. */
export async function copyPreviousSets(
  sessionExerciseId: string,
  target: GymLogDatabase = db
): Promise<WorkoutSet[]> {
  return target.transaction(
    'rw',
    target.workoutSessions,
    target.sessionExercises,
    target.workoutSets,
    async () => {
      const currentExercise = await requireSessionExercise(sessionExerciseId, target)
      const currentSession = await requireSession(currentExercise.sessionId, target)
      const previous = await getPreviousCompletedRecord(
        currentExercise.exerciseId,
        { excludeSessionId: currentSession.id, beforeStartedAt: currentSession.startedAt },
        target
      )
      if (!previous) return []

      await target.workoutSets.where('sessionExerciseId').equals(sessionExerciseId).delete()
      const timestamp = nowIso()
      const copies = previous.sets.map(
        (source, order): WorkoutSet => ({
          id: createId(),
          sessionId: currentExercise.sessionId,
          sessionExerciseId,
          exerciseId: currentExercise.exerciseId,
          order,
          weightKg: source.weightKg,
          reps: source.reps,
          createdAt: timestamp,
          updatedAt: timestamp
        })
      )
      if (copies.length) await target.workoutSets.bulkAdd(copies)
      return copies
    }
  )
}

export async function updateSessionNote(
  sessionId: string,
  note: string,
  target: GymLogDatabase = db
): Promise<WorkoutSession> {
  return target.transaction('rw', target.workoutSessions, async () => {
    const current = await requireSession(sessionId, target)
    const updated = { ...current, note, updatedAt: nowIso() }
    await target.workoutSessions.put(updated)
    return updated
  })
}

export async function completeSession(
  sessionId: string,
  target: GymLogDatabase = db
): Promise<WorkoutSession> {
  return target.transaction('rw', target.workoutSessions, async () => {
    const current = await requireSession(sessionId, target)
    if (current.status === 'completed') return current
    const timestamp = nowIso()
    const completed: WorkoutSession = {
      ...current,
      status: 'completed',
      endedAt: timestamp,
      updatedAt: timestamp
    }
    await target.workoutSessions.put(completed)
    return completed
  })
}

export async function deleteSession(
  sessionId: string,
  target: GymLogDatabase = db
): Promise<void> {
  await target.transaction(
    'rw',
    target.workoutSessions,
    target.sessionExercises,
    target.workoutSets,
    async () => {
      await target.workoutSets.where('sessionId').equals(sessionId).delete()
      await target.sessionExercises.where('sessionId').equals(sessionId).delete()
      await target.workoutSessions.delete(sessionId)
    }
  )
}
