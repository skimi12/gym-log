import type {
  EquipmentType,
  Exercise,
  LoadType,
  MuscleGroup
} from '../types/models'
import { createId } from '../types/models'
import { db, type GymLogDatabase } from '../db/database'
import type { MoveDirection } from './workoutService'

export interface ExerciseFilters {
  query?: string
  primaryMuscle?: MuscleGroup
  equipment?: EquipmentType
  favoritesOnly?: boolean
  includeArchived?: boolean
}

export interface CustomExerciseInput {
  name: string
  aliases?: string[]
  primaryMuscle: MuscleGroup
  secondaryMuscles?: MuscleGroup[]
  equipment: EquipmentType
  equipmentDetail?: string
  loadType: LoadType
}

export function normalizeExerciseSearch(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/\s+/g, '')
}

function matchesSearch(exercise: Exercise, query: string): boolean {
  const needle = normalizeExerciseSearch(query)
  if (!needle) return true
  return [exercise.name, ...exercise.aliases].some((candidate) =>
    normalizeExerciseSearch(candidate).includes(needle)
  )
}

function sortByName(a: Exercise, b: Exercise): number {
  return a.name.localeCompare(b.name, 'ja')
}

function sortFavorites(a: Exercise, b: Exercise): number {
  return (
    (a.favoriteOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.favoriteOrder ?? Number.MAX_SAFE_INTEGER) || sortByName(a, b)
  )
}

async function compactFavoriteOrders(target: GymLogDatabase): Promise<void> {
  const favorites = (await target.exercises.toArray())
    .filter((exercise) => exercise.isFavorite && exercise.isActive)
    .sort(sortFavorites)
  const timestamp = new Date().toISOString()
  const updates = favorites
    .map((exercise, favoriteOrder) => ({ ...exercise, favoriteOrder, updatedAt: timestamp }))
    .filter((exercise, index) => favorites[index].favoriteOrder !== exercise.favoriteOrder)
  if (updates.length) await target.exercises.bulkPut(updates)
}

export async function getExercises(
  filters: ExerciseFilters = {},
  target: GymLogDatabase = db
): Promise<Exercise[]> {
  let collection: Exercise[]
  if (filters.primaryMuscle) {
    collection = await target.exercises
      .where('primaryMuscle')
      .equals(filters.primaryMuscle)
      .toArray()
  } else if (filters.equipment) {
    collection = await target.exercises.where('equipment').equals(filters.equipment).toArray()
  } else {
    collection = await target.exercises.toArray()
  }

  return collection
    .filter((exercise) => filters.includeArchived || exercise.isActive)
    .filter((exercise) => !filters.favoritesOnly || exercise.isFavorite)
    .filter((exercise) => !filters.primaryMuscle || exercise.primaryMuscle === filters.primaryMuscle)
    .filter((exercise) => !filters.equipment || exercise.equipment === filters.equipment)
    .filter((exercise) => !filters.query || matchesSearch(exercise, filters.query))
    .sort(filters.favoritesOnly ? sortFavorites : sortByName)
}

export async function searchExercises(
  query: string,
  target: GymLogDatabase = db
): Promise<Exercise[]> {
  return getExercises({ query }, target)
}

export async function getFavoriteExercises(
  target: GymLogDatabase = db
): Promise<Exercise[]> {
  return getExercises({ favoritesOnly: true }, target)
}

export async function toggleFavorite(
  exerciseId: string,
  target: GymLogDatabase = db
): Promise<Exercise> {
  return target.transaction('rw', target.exercises, async () => {
    const exercise = await target.exercises.get(exerciseId)
    if (!exercise || !exercise.isActive) throw new Error('Exercise not found')
    const timestamp = new Date().toISOString()

    if (exercise.isFavorite) {
      const updated: Exercise = {
        ...exercise,
        isFavorite: false,
        favoriteOrder: undefined,
        updatedAt: timestamp
      }
      await target.exercises.put(updated)
      await compactFavoriteOrders(target)
      return updated
    }

    const favorites = (await target.exercises.toArray()).filter(
      (candidate) => candidate.isFavorite && candidate.isActive
    )
    const nextOrder = favorites.reduce(
      (maximum, candidate) => Math.max(maximum, candidate.favoriteOrder ?? -1),
      -1
    ) + 1
    const updated: Exercise = {
      ...exercise,
      isFavorite: true,
      favoriteOrder: nextOrder,
      updatedAt: timestamp
    }
    await target.exercises.put(updated)
    return updated
  })
}

export async function reorderFavorites(
  orderedExerciseIds: string[],
  target: GymLogDatabase = db
): Promise<Exercise[]> {
  return target.transaction('rw', target.exercises, async () => {
    const favorites = (await target.exercises.toArray()).filter(
      (exercise) => exercise.isFavorite && exercise.isActive
    )
    const expected = new Set(favorites.map((exercise) => exercise.id))
    const requested = new Set(orderedExerciseIds)
    if (
      requested.size !== orderedExerciseIds.length ||
      expected.size !== requested.size ||
      [...expected].some((id) => !requested.has(id))
    ) {
      throw new Error('Favorite order must include every favorite exactly once')
    }

    const byId = new Map(favorites.map((exercise) => [exercise.id, exercise]))
    const timestamp = new Date().toISOString()
    const updates = orderedExerciseIds.map((id, favoriteOrder): Exercise => ({
      ...byId.get(id)!,
      favoriteOrder,
      updatedAt: timestamp
    }))
    if (updates.length) await target.exercises.bulkPut(updates)
    return updates
  })
}

export async function moveFavorite(
  exerciseId: string,
  direction: MoveDirection,
  target: GymLogDatabase = db
): Promise<Exercise[]> {
  return target.transaction('rw', target.exercises, async () => {
    const favorites = (await target.exercises.toArray())
      .filter((exercise) => exercise.isFavorite && exercise.isActive)
      .sort(sortFavorites)
    const index = favorites.findIndex((exercise) => exercise.id === exerciseId)
    const destination = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || destination < 0 || destination >= favorites.length) return favorites
    ;[favorites[index], favorites[destination]] = [favorites[destination], favorites[index]]

    const timestamp = new Date().toISOString()
    const updates = favorites.map((exercise, favoriteOrder): Exercise => ({
      ...exercise,
      favoriteOrder,
      updatedAt: timestamp
    }))
    await target.exercises.bulkPut(updates)
    return updates
  })
}

export async function createCustomExercise(
  input: CustomExerciseInput,
  target: GymLogDatabase = db
): Promise<Exercise> {
  const name = input.name.trim()
  if (!name) throw new Error('Exercise name is required')
  const timestamp = new Date().toISOString()
  const exercise: Exercise = {
    id: createId(),
    name,
    aliases: (input.aliases ?? []).map((alias) => alias.trim()).filter(Boolean),
    primaryMuscle: input.primaryMuscle,
    secondaryMuscles: [...new Set(input.secondaryMuscles ?? [])].filter(
      (muscle) => muscle !== input.primaryMuscle
    ),
    equipment: input.equipment,
    equipmentDetail: input.equipmentDetail?.trim() || undefined,
    loadType: input.loadType,
    isBuiltIn: false,
    isFavorite: false,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  }
  await target.exercises.add(exercise)
  return exercise
}

export async function updateCustomExercise(
  exerciseId: string,
  changes: Partial<CustomExerciseInput>,
  target: GymLogDatabase = db
): Promise<Exercise> {
  const current = await target.exercises.get(exerciseId)
  if (!current || current.isBuiltIn) throw new Error('Custom exercise not found')
  const name = changes.name === undefined ? current.name : changes.name.trim()
  if (!name) throw new Error('Exercise name is required')

  const primaryMuscle = changes.primaryMuscle ?? current.primaryMuscle
  const updated: Exercise = {
    ...current,
    ...changes,
    name,
    aliases:
      changes.aliases === undefined
        ? current.aliases
        : changes.aliases.map((alias) => alias.trim()).filter(Boolean),
    secondaryMuscles: [
      ...new Set(changes.secondaryMuscles ?? current.secondaryMuscles)
    ].filter((muscle) => muscle !== primaryMuscle),
    equipmentDetail:
      changes.equipmentDetail === undefined
        ? current.equipmentDetail
        : changes.equipmentDetail.trim() || undefined,
    primaryMuscle,
    updatedAt: new Date().toISOString()
  }
  await target.exercises.put(updated)
  return updated
}

/** Soft deletion keeps exercise IDs resolvable by historical sets. */
export async function archiveCustomExercise(
  exerciseId: string,
  target: GymLogDatabase = db
): Promise<Exercise> {
  return target.transaction('rw', target.exercises, async () => {
    const current = await target.exercises.get(exerciseId)
    if (!current || current.isBuiltIn) throw new Error('Built-in exercises cannot be archived')
    const updated: Exercise = {
      ...current,
      isActive: false,
      isFavorite: false,
      favoriteOrder: undefined,
      updatedAt: new Date().toISOString()
    }
    await target.exercises.put(updated)
    await compactFavoriteOrders(target)
    return updated
  })
}

export async function restoreCustomExercise(
  exerciseId: string,
  target: GymLogDatabase = db
): Promise<Exercise> {
  const current = await target.exercises.get(exerciseId)
  if (!current || current.isBuiltIn) throw new Error('Custom exercise not found')
  const updated = { ...current, isActive: true, updatedAt: new Date().toISOString() }
  await target.exercises.put(updated)
  return updated
}
