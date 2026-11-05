import { useMemo } from 'react'
import type { EquipmentType, Exercise, MuscleGroup } from '../types/models'
import { matchesExerciseSearch } from '../utils/search'

export { matchesExerciseSearch } from '../utils/search'

interface ExerciseCatalogFilter {
  query?: string
  muscle?: MuscleGroup
  equipment?: EquipmentType
}

export function sortFavorites(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((a, b) => {
    const orderA = a.favoriteOrder ?? Number.MAX_SAFE_INTEGER
    const orderB = b.favoriteOrder ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB || a.name.localeCompare(b.name, 'ja')
  })
}

export function useExerciseCatalog(exercises: Exercise[], filter: ExerciseCatalogFilter = {}) {
  return useMemo(() => {
    const active = exercises.filter((exercise) => exercise.isActive)
    const filtered = active.filter((exercise) => {
      if (filter.query && !matchesExerciseSearch(exercise, filter.query)) return false
      if (filter.muscle && exercise.primaryMuscle !== filter.muscle && !exercise.secondaryMuscles.includes(filter.muscle)) return false
      if (filter.equipment && exercise.equipment !== filter.equipment) return false
      return true
    })
    return {
      all: filtered.sort((a, b) => a.name.localeCompare(b.name, 'ja')),
      favorites: sortFavorites(filtered.filter((exercise) => exercise.isFavorite))
    }
  }, [exercises, filter.equipment, filter.muscle, filter.query])
}
