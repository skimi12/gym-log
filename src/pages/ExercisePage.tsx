import { Plus, Search, Star } from 'lucide-react'
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
import { CustomExerciseForm, type CustomExerciseInput } from '../components/CustomExerciseForm'
import { ExerciseList } from '../components/ExerciseList'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'

type CatalogView = 'favorites' | 'all' | 'muscle' | 'equipment'

interface ExercisePageProps {
  exercises: Exercise[]
  onOpenExercise: (exerciseId: string) => void
  onToggleFavorite: (exercise: Exercise) => void | Promise<void>
  onMoveFavorite: (exercise: Exercise, direction: 'up' | 'down') => void | Promise<void>
  onCreateExercise: (input: CustomExerciseInput) => void | Promise<void>
  onArchiveCustomExercise: (exercise: Exercise) => void | Promise<void>
  onError?: (message: string) => void
}

const catalogTabs: Array<{ id: CatalogView; label: string }> = [
  { id: 'favorites', label: 'お気に入り' },
  { id: 'all', label: '全種目' },
  { id: 'muscle', label: '部位別' },
  { id: 'equipment', label: '器具別' }
]

export function ExercisePage({
  exercises,
  onOpenExercise,
  onToggleFavorite,
  onMoveFavorite,
  onCreateExercise,
  onArchiveCustomExercise,
  onError
}: ExercisePageProps) {
  const [view, setView] = useState<CatalogView>('favorites')
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | undefined>()
  const [equipment, setEquipment] = useState<EquipmentType | undefined>()
  const [reorderMode, setReorderMode] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const activeExercises = useMemo(() => exercises.filter((exercise) => exercise.isActive), [exercises])
  const favorites = useMemo(
    () => sortFavorites(activeExercises.filter((exercise) => exercise.isFavorite)),
    [activeExercises]
  )

  const visibleExercises = useMemo(() => {
    if (query.trim()) return activeExercises.filter((exercise) => matchesExerciseSearch(exercise, query))
    if (view === 'favorites') return favorites
    if (view === 'muscle') {
      if (!muscle) return []
      return activeExercises.filter(
        (exercise) => exercise.primaryMuscle === muscle || exercise.secondaryMuscles.includes(muscle)
      )
    }
    if (view === 'equipment') {
      if (!equipment) return []
      return activeExercises.filter((exercise) => exercise.equipment === equipment)
    }
    return [...activeExercises].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }, [activeExercises, equipment, favorites, muscle, query, view])

  const archiveCustom = async (exercise: Exercise) => {
    const confirmed = window.confirm(
      `「${exercise.name}」を種目一覧から非表示にしますか？\n過去の記録は残ります。`
    )
    if (!confirmed) return
    try {
      await onArchiveCustomExercise(exercise)
    } catch (error) {
      console.error('カスタム種目を非表示にできませんでした', error)
      onError?.('種目の更新に失敗しました')
    }
  }

  const toggleFavorite = async (exercise: Exercise) => {
    try {
      await onToggleFavorite(exercise)
    } catch (error) {
      console.error('お気に入りの更新に失敗しました', error)
      onError?.('お気に入りの保存に失敗しました')
    }
  }

  const moveFavorite = async (exercise: Exercise, direction: 'up' | 'down') => {
    try {
      await onMoveFavorite(exercise, direction)
    } catch (error) {
      console.error('お気に入りの並べ替えに失敗しました', error)
      onError?.('並べ替えの保存に失敗しました')
    }
  }

  const emptyTitle = query.trim()
    ? '該当する種目がありません'
    : view === 'favorites'
      ? 'お気に入り種目はまだありません'
      : view === 'muscle' && !muscle
        ? '部位を選んでください'
        : view === 'equipment' && !equipment
          ? '器具を選んでください'
          : '該当する種目がありません'

  return (
    <main className="page page--with-tabs exercise-page">
      <PageHeader
        title="種目"
        eyebrow={`${activeExercises.length}種目`}
        trailing={
          <button className="button button--small button--primary" type="button" onClick={() => setShowCreate(true)}>
            <Plus aria-hidden="true" size={18} />追加
          </button>
        }
      />

      <label className="search-field search-field--sticky">
        <span className="sr-only">種目を検索</span>
        <Search aria-hidden="true" size={20} />
        <input type="search" inputMode="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="種目名・別名で検索" />
      </label>

      {!query.trim() ? (
        <div className="scroll-tabs" role="group" aria-label="種目の分類">
          {catalogTabs.map((tab) => (
            <button
              className="scroll-tabs__item"
              data-active={view === tab.id || undefined}
              type="button"
              aria-pressed={view === tab.id}
              onClick={() => {
                setView(tab.id)
                setReorderMode(false)
              }}
              key={tab.id}
            >
              {tab.id === 'favorites' ? <Star aria-hidden="true" size={16} fill={view === tab.id ? 'currentColor' : 'none'} /> : null}
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {!query.trim() && view === 'muscle' ? (
        <div className="filter-chips filter-chips--roomy" role="group" aria-label="部位を選択">
          {MUSCLE_GROUPS.map((item) => (
            <button className="filter-chip" aria-pressed={muscle === item} data-active={muscle === item || undefined} type="button" onClick={() => setMuscle(item)} key={item}>
              {MUSCLE_LABELS[item]}
            </button>
          ))}
        </div>
      ) : null}

      {!query.trim() && view === 'equipment' ? (
        <div className="filter-chips filter-chips--roomy" role="group" aria-label="器具を選択">
          {EQUIPMENT_TYPES.map((item) => (
            <button className="filter-chip" aria-pressed={equipment === item} data-active={equipment === item || undefined} type="button" onClick={() => setEquipment(item)} key={item}>
              {EQUIPMENT_LABELS[item]}
            </button>
          ))}
        </div>
      ) : null}

      <div className="list-toolbar">
        <span>{query.trim() ? `検索結果 ${visibleExercises.length}件` : visibleExercises.length ? `${visibleExercises.length}種目` : '\u00a0'}</span>
        {!query.trim() && view === 'favorites' && favorites.length > 1 ? (
          <button className="text-button" type="button" aria-pressed={reorderMode} onClick={() => setReorderMode((value) => !value)}>
            {reorderMode ? '完了' : '並べ替え'}
          </button>
        ) : null}
      </div>

      <ExerciseList
        exercises={visibleExercises}
        onSelect={(exercise) => onOpenExercise(exercise.id)}
        onToggleFavorite={(exercise) => void toggleFavorite(exercise)}
        onMoveFavorite={(exercise, direction) => void moveFavorite(exercise, direction)}
        onArchiveCustom={(exercise) => void archiveCustom(exercise)}
        reorderMode={reorderMode && view === 'favorites' && !query.trim()}
        emptyTitle={emptyTitle}
      />

      {showCreate ? (
        <Modal title="種目を追加" onClose={() => setShowCreate(false)} size="large">
          <CustomExerciseForm
            onSubmit={async (input) => {
              await onCreateExercise(input)
              setShowCreate(false)
            }}
            onCancel={() => setShowCreate(false)}
            onError={onError}
          />
        </Modal>
      ) : null}
    </main>
  )
}
