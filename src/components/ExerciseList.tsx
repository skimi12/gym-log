import { ArrowDown, ArrowUp, Check, ChevronRight, Trash2 } from 'lucide-react'
import { EQUIPMENT_LABELS, MUSCLE_LABELS, type Exercise } from '../types/models'
import { EmptyState } from './EmptyState'
import { FavoriteButton } from './FavoriteButton'

interface ExerciseListProps {
  exercises: Exercise[]
  onSelect?: (exercise: Exercise) => void
  onToggleFavorite?: (exercise: Exercise) => void
  onMoveFavorite?: (exercise: Exercise, direction: 'up' | 'down') => void
  onArchiveCustom?: (exercise: Exercise) => void
  reorderMode?: boolean
  disabledIds?: ReadonlySet<string>
  emptyTitle?: string
  emptyDescription?: string
  dense?: boolean
}

export function ExerciseList({
  exercises,
  onSelect,
  onToggleFavorite,
  onMoveFavorite,
  onArchiveCustom,
  reorderMode = false,
  disabledIds,
  emptyTitle = '該当する種目がありません',
  emptyDescription,
  dense = false
}: ExerciseListProps) {
  if (exercises.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} compact />
  }

  return (
    <ul className={`exercise-list${dense ? ' exercise-list--dense' : ''}`}>
      {exercises.map((exercise, index) => {
        const isDisabled = disabledIds?.has(exercise.id) ?? false
        return (
          <li className="exercise-row" key={exercise.id} data-disabled={isDisabled || undefined}>
            <button
              className="exercise-row__main"
              type="button"
              onClick={() => onSelect?.(exercise)}
              disabled={!onSelect || isDisabled}
              aria-label={`${exercise.name}${isDisabled ? '、追加済み' : ''}`}
            >
              <span className="exercise-row__copy">
                <strong>{exercise.name}</strong>
                <small>
                  {MUSCLE_LABELS[exercise.primaryMuscle]}
                  <span aria-hidden="true"> · </span>
                  {EQUIPMENT_LABELS[exercise.equipment]}
                  {exercise.equipmentDetail ? ` / ${exercise.equipmentDetail}` : ''}
                </small>
              </span>
              {isDisabled ? <Check className="exercise-row__check" aria-hidden="true" size={19} /> : onSelect ? <ChevronRight aria-hidden="true" size={18} /> : null}
            </button>
            <div className="exercise-row__actions">
              {reorderMode && onMoveFavorite ? (
                <>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onMoveFavorite(exercise, 'up')}
                    aria-label={`${exercise.name}を上へ移動`}
                    disabled={index === 0}
                  >
                    <ArrowUp aria-hidden="true" size={19} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onMoveFavorite(exercise, 'down')}
                    aria-label={`${exercise.name}を下へ移動`}
                    disabled={index === exercises.length - 1}
                  >
                    <ArrowDown aria-hidden="true" size={19} />
                  </button>
                </>
              ) : null}
              {onToggleFavorite ? (
                <FavoriteButton
                  isFavorite={exercise.isFavorite}
                  exerciseName={exercise.name}
                  onToggle={() => onToggleFavorite(exercise)}
                />
              ) : null}
              {onArchiveCustom && !exercise.isBuiltIn ? (
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  onClick={() => onArchiveCustom(exercise)}
                  aria-label={`${exercise.name}を非表示にする`}
                >
                  <Trash2 aria-hidden="true" size={18} />
                </button>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
