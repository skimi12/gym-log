export const DATABASE_NAME = 'gym-log'

/**
 * Version 1 is intentionally explicit. Future schema changes must add another
 * `version()` declaration instead of mutating this definition in place.
 */
export const DATABASE_VERSION = 1

export const DATABASE_STORES = {
  exercises:
    '&id, name, primaryMuscle, equipment, favoriteOrder, updatedAt',
  workoutSessions: '&id, status, startedAt, endedAt, [status+startedAt]',
  sessionExercises:
    '&id, sessionId, exerciseId, order, [sessionId+order], [sessionId+exerciseId], [exerciseId+sessionId]',
  workoutSets:
    '&id, sessionId, sessionExerciseId, exerciseId, order, [sessionId+order], [sessionExerciseId+order], [exerciseId+sessionId], createdAt',
  settings: '&id'
} as const
