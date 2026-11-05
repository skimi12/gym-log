import type { AppSettings } from '../types/models'
import { db, type GymLogDatabase } from './database'
import { seedBuiltInExercises } from './seeds/seedExercises'

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  unit: 'kg',
  theme: 'system'
}

const pendingInitializations = new WeakMap<GymLogDatabase, Promise<void>>()

/** Opens the database, applies additive seeds, and installs default settings. */
export function initializeDatabase(target: GymLogDatabase = db): Promise<void> {
  const pending = pendingInitializations.get(target)
  if (pending) return pending

  const initialization = (async () => {
    if (!target.isOpen()) await target.open()
    await seedBuiltInExercises(target)

    await target.transaction('rw', target.settings, async () => {
      const current = await target.settings.get('app')
      if (!current) await target.settings.add({ ...DEFAULT_SETTINGS })
    })
  })()

  pendingInitializations.set(target, initialization)
  initialization.then(
    () => pendingInitializations.delete(target),
    () => pendingInitializations.delete(target)
  )
  return initialization
}
