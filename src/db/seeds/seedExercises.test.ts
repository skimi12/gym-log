import { afterEach, describe, expect, it } from 'vitest'

import { createDatabase, type GymLogDatabase } from '../database'
import { BUILT_IN_EXERCISES } from './exercises'
import { seedBuiltInExercises } from './seedExercises'

const databases: GymLogDatabase[] = []

function testDatabase(): GymLogDatabase {
  const database = createDatabase(`seed-test-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

describe('built-in exercise seed', () => {
  it('contains a unique, maintainable 120–140 exercise catalogue', () => {
    expect(BUILT_IN_EXERCISES.length).toBeGreaterThanOrEqual(120)
    expect(BUILT_IN_EXERCISES.length).toBeLessThanOrEqual(140)
    expect(new Set(BUILT_IN_EXERCISES.map((exercise) => exercise.id)).size).toBe(
      BUILT_IN_EXERCISES.length
    )
    expect(BUILT_IN_EXERCISES.every((exercise) => exercise.equipmentDetail)).toBe(true)
  })

  it('is idempotent and preserves the user favorite state', async () => {
    const database = testDatabase()
    const first = await seedBuiltInExercises(database)
    const favoriteId = 'builtin-barbell-bench-press'
    await database.exercises.update(favoriteId, { isFavorite: true, favoriteOrder: 3 })

    const second = await seedBuiltInExercises(database)
    const favorite = await database.exercises.get(favoriteId)

    expect(first.inserted).toBe(BUILT_IN_EXERCISES.length)
    expect(second.inserted).toBe(0)
    expect(second.updated).toBe(0)
    expect(await database.exercises.count()).toBe(BUILT_IN_EXERCISES.length)
    expect(favorite).toMatchObject({ isFavorite: true, favoriteOrder: 3 })
  })
})
