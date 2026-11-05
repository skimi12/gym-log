import Dexie, { type Table } from 'dexie'

import type {
  AppSettings,
  Exercise,
  SessionExercise,
  WorkoutSession,
  WorkoutSet
} from '../types/models'
import { DATABASE_NAME, DATABASE_STORES, DATABASE_VERSION } from './schema'

export class GymLogDatabase extends Dexie {
  exercises!: Table<Exercise, string>
  workoutSessions!: Table<WorkoutSession, string>
  sessionExercises!: Table<SessionExercise, string>
  workoutSets!: Table<WorkoutSet, string>
  settings!: Table<AppSettings, 'app'>

  constructor(name = DATABASE_NAME) {
    super(name)

    this.version(DATABASE_VERSION).stores(DATABASE_STORES)
  }
}

export const db = new GymLogDatabase()

export function createDatabase(name: string): GymLogDatabase {
  return new GymLogDatabase(name)
}
