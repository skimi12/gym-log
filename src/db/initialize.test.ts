import { afterEach, describe, expect, it } from 'vitest'

import { createDatabase, type GymLogDatabase } from './database'
import { initializeDatabase } from './initialize'
import { BUILT_IN_EXERCISES } from './seeds/exercises'

const databases: GymLogDatabase[] = []

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

describe('database initialization', () => {
  it('installs defaults once and preserves settings on a repeated call', async () => {
    const database = createDatabase(`initialize-test-${crypto.randomUUID()}`)
    databases.push(database)

    await initializeDatabase(database)
    await database.settings.update('app', { unit: 'lb', theme: 'dark' })
    await initializeDatabase(database)

    expect(await database.exercises.count()).toBe(BUILT_IN_EXERCISES.length)
    expect(await database.settings.get('app')).toMatchObject({ unit: 'lb', theme: 'dark' })
  })
})
