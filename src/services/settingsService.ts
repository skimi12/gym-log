import type { AppSettings } from '../types/models'
import { db, type GymLogDatabase } from '../db/database'
import { DEFAULT_SETTINGS } from '../db/initialize'

export async function getSettings(target: GymLogDatabase = db): Promise<AppSettings> {
  const settings = await target.settings.get('app')
  if (settings) return settings
  await target.settings.put({ ...DEFAULT_SETTINGS })
  return { ...DEFAULT_SETTINGS }
}

export async function updateSettings(
  changes: Partial<Omit<AppSettings, 'id'>>,
  target: GymLogDatabase = db
): Promise<AppSettings> {
  const current = await getSettings(target)
  const updated: AppSettings = { ...current, ...changes, id: 'app' }
  await target.settings.put(updated)
  return updated
}
