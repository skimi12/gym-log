import type { Exercise } from '../../types/models'
import { db, type GymLogDatabase } from '../database'
import { BUILT_IN_EXERCISES } from './exercises'

export interface SeedResult {
  inserted: number
  updated: number
  total: number
}

const CANONICAL_FIELDS: ReadonlyArray<keyof Exercise> = [
  'name',
  'aliases',
  'primaryMuscle',
  'secondaryMuscles',
  'equipment',
  'equipmentDetail',
  'loadType',
  'isBuiltIn',
  'isActive'
]

function canonicalDataChanged(current: Exercise, incoming: Exercise): boolean {
  return CANONICAL_FIELDS.some(
    (field) => JSON.stringify(current[field]) !== JSON.stringify(incoming[field])
  )
}

/**
 * Upserts the fixed-ID catalogue. User-owned favorite state is deliberately
 * copied from the existing row so an app update can never reset it.
 */
export async function seedBuiltInExercises(
  target: GymLogDatabase = db
): Promise<SeedResult> {
  const ids = BUILT_IN_EXERCISES.map((exercise) => exercise.id)
  if (new Set(ids).size !== ids.length) {
    throw new Error('Built-in exercise IDs must be unique')
  }

  return target.transaction('rw', target.exercises, async () => {
    const currentRows = await target.exercises.bulkGet(ids)
    const now = new Date().toISOString()
    let inserted = 0
    let updated = 0

    const rows = BUILT_IN_EXERCISES.map((incoming, index): Exercise => {
      const current = currentRows[index]

      if (!current) {
        inserted += 1
        return {
          ...incoming,
          aliases: [...incoming.aliases],
          secondaryMuscles: [...incoming.secondaryMuscles]
        }
      }

      if (canonicalDataChanged(current, incoming)) updated += 1

      return {
        ...incoming,
        aliases: [...incoming.aliases],
        secondaryMuscles: [...incoming.secondaryMuscles],
        isFavorite: current.isFavorite,
        favoriteOrder: current.favoriteOrder,
        createdAt: current.createdAt,
        updatedAt: canonicalDataChanged(current, incoming) ? now : current.updatedAt
      }
    })

    await target.exercises.bulkPut(rows)
    return { inserted, updated, total: rows.length }
  })
}
