import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDatabase, type GymLogDatabase } from '../db/database'
import {
  archiveCustomExercise,
  createCustomExercise,
  getFavoriteExercises,
  moveFavorite,
  reorderFavorites,
  searchExercises,
  toggleFavorite
} from './exerciseService'

describe('exercise persistence services', () => {
  let database: GymLogDatabase

  beforeEach(async () => {
    database = createDatabase(`exercise-service-test-${crypto.randomUUID()}`)
    await database.open()
  })

  afterEach(async () => {
    await database.delete()
  })

  it('toggles and deterministically reorders favorites', async () => {
    const first = await createCustomExercise(
      {
        name: 'テストプレス',
        aliases: ['プレス A'],
        primaryMuscle: 'chest',
        equipment: 'dumbbell',
        loadType: 'weighted'
      },
      database
    )
    const second = await createCustomExercise(
      {
        name: 'テストロー',
        aliases: ['ロー B'],
        primaryMuscle: 'back',
        equipment: 'cable',
        loadType: 'weighted'
      },
      database
    )

    await toggleFavorite(first.id, database)
    await toggleFavorite(second.id, database)
    await reorderFavorites([second.id, first.id], database)

    expect((await getFavoriteExercises(database)).map((exercise) => exercise.id)).toEqual([
      second.id,
      first.id
    ])
  })

  it('soft-deletes custom exercises and keeps their row available to history', async () => {
    const custom = await createCustomExercise(
      {
        name: '履歴を残す種目',
        aliases: ['アーカイブ テスト'],
        primaryMuscle: 'other',
        equipment: 'other',
        loadType: 'weighted'
      },
      database
    )
    await toggleFavorite(custom.id, database)

    const archived = await archiveCustomExercise(custom.id, database)

    expect(archived).toMatchObject({ isActive: false, isFavorite: false })
    expect(await database.exercises.get(custom.id)).toBeDefined()
    expect(await searchExercises('アーカイブテスト', database)).toEqual([])
  })

  it('serializes rapid favorite moves without dropping a tap', async () => {
    const favorites = await Promise.all(['A', 'B', 'C'].map((suffix) =>
      createCustomExercise(
        {
          name: `並べ替え ${suffix}`,
          primaryMuscle: 'other',
          equipment: 'other',
          loadType: 'weighted'
        },
        database
      )
    ))
    for (const exercise of favorites) await toggleFavorite(exercise.id, database)

    await Promise.all([
      moveFavorite(favorites[2].id, 'up', database),
      moveFavorite(favorites[2].id, 'up', database)
    ])

    expect((await getFavoriteExercises(database)).map((exercise) => exercise.id)).toEqual([
      favorites[2].id,
      favorites[0].id,
      favorites[1].id
    ])
  })
})
