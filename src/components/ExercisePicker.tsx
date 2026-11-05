import { Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  type EquipmentType,
  type Exercise,
  type MuscleGroup
} from '../types/models'
import { matchesExerciseSearch, sortFavorites } from '../hooks/useExerciseCatalog'
import { ExerciseList } from './ExerciseList'

type PickerSection = 'favorites' | 'recent' | 'muscle' | 'equipment' | 'all'

interface ExercisePickerProps {
  exercises: Exercise[]
  recentExerciseIds?: string[]
  selectedExerciseIds?: ReadonlySet<string>
  onSelect: (exercise: Exercise) => void | Promise<void>
  onToggleFavorite?: (exercise: Exercise) => void | Promise<void>
  onError?: (message: string) => void
  autoFocusSearch?: boolean
}

const sectionLabels: Array<{ id: PickerSection; label: string }> = [
  { id: 'favorites', label: 'お気に入り' },
  { id: 'recent', label: '最近' },
  { id: 'muscle', label: '部位' },
  { id: 'equipment', label: '器具' },
  { id: 'all', label: '全種目' }
]

export function ExercisePicker({
  exercises,
  recentExerciseIds = [],
  selectedExerciseIds,
  onSelect,
  onToggleFavorite,
  onError,
  autoFocusSearch = false
}: ExercisePickerProps) {
  const [section, setSection] = useState<PickerSection>('favorites')
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | undefined>()
  const [equipment, setEquipment] = useState<EquipmentType | undefined>()
  const [pendingId, setPendingId] = useState<string>()

  const activeExercises = useMemo(() => exercises.filter((exercise) => exercise.isActive), [exercises])
  const favorites = useMemo(
    () => sortFavorites(activeExercises.filter((exercise) => exercise.isFavorite)),
    [activeExercises]
  )
  const recent = useMemo(() => {
    const byId = new Map(activeExercises.map((exercise) => [exercise.id, exercise]))
    return recentExerciseIds.map((id) => byId.get(id)).filter((exercise): exercise is Exercise => Boolean(exercise))
  }, [activeExercises, recentExerciseIds])

  const visibleExercises = useMemo(() => {
    if (query.trim()) return activeExercises.filter((exercise) => matchesExerciseSearch(exercise, query))
    if (section === 'favorites') return favorites
    if (section === 'recent') return recent
    if (section === 'muscle') {
      if (!muscle) return []
      return activeExercises.filter(
        (exercise) => exercise.primaryMuscle === muscle || exercise.secondaryMuscles.includes(muscle)
      )
    }
    if (section === 'equipment') {
      if (!equipment) return []
      return activeExercises.filter((exercise) => exercise.equipment === equipment)
    }
    return [...activeExercises].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }, [activeExercises, equipment, favorites, muscle, query, recent, section])

  const selectExercise = async (exercise: Exercise) => {
    setPendingId(exercise.id)
    try {
      await onSelect(exercise)
    } catch (error) {
      console.error('種目を追加できませんでした', error)
      onError?.('種目の追加に失敗しました')
    } finally {
      setPendingId(undefined)
    }
  }

  const toggleFavorite = async (exercise: Exercise) => {
    if (!onToggleFavorite) return
    try {
      await onToggleFavorite(exercise)
    } catch (error) {
      console.error('お気に入りの更新に失敗しました', error)
      onError?.('お気に入りの保存に失敗しました')
    }
  }

  const emptyTitle = query.trim()
    ? '該当する種目がありません'
    : section === 'favorites'
      ? 'お気に入り種目はまだありません'
      : section === 'recent'
        ? '最近使った種目はまだありません'
        : section === 'muscle' && !muscle
          ? '部位を選んでください'
          : section === 'equipment' && !equipment
            ? '器具を選んでください'
            : '該当する種目がありません'

  return (
    <div className="exercise-picker">
      <label className="search-field">
        <span className="sr-only">種目を検索</span>
        <Search aria-hidden="true" size={20} />
        <input
          type="search"
          inputMode="search"
          placeholder="種目名・別名で検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus={autoFocusSearch}
        />
      </label>

      {!query.trim() ? (
        <div className="scroll-tabs" role="group" aria-label="種目の探し方">
          {sectionLabels.map((item) => (
            <button
              className="scroll-tabs__item"
              data-active={section === item.id || undefined}
              aria-pressed={section === item.id}
              type="button"
              onClick={() => setSection(item.id)}
              key={item.id}
            >
              {item.id === 'favorites' ? <Star aria-hidden="true" size={16} fill={section === item.id ? 'currentColor' : 'none'} /> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {!query.trim() && section === 'muscle' ? (
        <div className="filter-chips" aria-label="部位を選択">
          {MUSCLE_GROUPS.map((item) => (
            <button className="filter-chip" aria-pressed={muscle === item} data-active={muscle === item || undefined} type="button" onClick={() => setMuscle(item)} key={item}>
              {MUSCLE_LABELS[item]}
            </button>
          ))}
        </div>
      ) : null}

      {!query.trim() && section === 'equipment' ? (
        <div className="filter-chips" aria-label="器具を選択">
          {EQUIPMENT_TYPES.map((item) => (
            <button className="filter-chip" aria-pressed={equipment === item} data-active={equipment === item || undefined} type="button" onClick={() => setEquipment(item)} key={item}>
              {EQUIPMENT_LABELS[item]}
            </button>
          ))}
        </div>
      ) : null}

      <p className="results-count" aria-live="polite">
        {query.trim() ? `検索結果 ${visibleExercises.length}件` : visibleExercises.length > 0 ? `${visibleExercises.length}種目` : '\u00a0'}
      </p>
      <ExerciseList
        exercises={visibleExercises}
        onSelect={selectExercise}
        onToggleFavorite={onToggleFavorite ? (exercise) => void toggleFavorite(exercise) : undefined}
        disabledIds={pendingId ? new Set([...(selectedExerciseIds ?? []), pendingId]) : selectedExerciseIds}
        emptyTitle={emptyTitle}
        dense
      />
    </div>
  )
}
