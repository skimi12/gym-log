import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react'
import type { Exercise, WorkoutSet } from '../../types/models'
import { formatWorkoutSet } from '../../utils/analytics'
import { fromDisplayWeight, roundDisplayWeight } from '../../utils/units'
import './workout.css'

type Unit = 'kg' | 'lb'

interface ExerciseSetEditorProps {
  exercise: Exercise
  sets: WorkoutSet[]
  previous?: { dateLabel: string; sets: WorkoutSet[] }
  unit: Unit
  editable?: boolean
  onCopyPrevious: () => void | Promise<void>
  onAddSet: () => void | Promise<void>
  onUpdateSet: (setId: string, changes: Pick<Partial<WorkoutSet>, 'weightKg' | 'reps'>) => void | Promise<void>
  onDuplicateSet: (setId: string) => void | Promise<void>
  onDeleteSet: (setId: string) => void | Promise<void>
  onMoveSet: (setId: string, direction: 'up' | 'down') => void | Promise<void>
  onMoveExercise: (direction: 'up' | 'down') => void | Promise<void>
  onRemoveExercise: () => void | Promise<void>
  canMoveExerciseUp: boolean
  canMoveExerciseDown: boolean
}

function WeightInput({
  set,
  unit,
  loadType,
  disabled,
  onChange
}: {
  set: WorkoutSet
  unit: Unit
  loadType: Exercise['loadType']
  disabled: boolean
  onChange: (weightKg: number | undefined) => void
}) {
  const displayed = set.weightKg === undefined ? '' : String(roundDisplayWeight(set.weightKg, unit))
  const [value, setValue] = useState(displayed)

  useEffect(() => setValue(displayed), [displayed])

  if (loadType === 'bodyweight') return <span className="set-static-value">自重</span>

  const hasAdditionalWeight = loadType !== 'bodyweightAdded'
    || (value.trim() !== '' && Number(value) > 0)

  return (
    <div className="number-with-unit">
      <span aria-hidden="true">{loadType === 'bodyweightAdded' && hasAdditionalWeight ? '+' : ''}</span>
      <input
        aria-label={loadType === 'assisted' ? `セット${set.order + 1}の補助重量` : `セット${set.order + 1}の重量`}
        className="number-input"
        disabled={disabled}
        inputMode="decimal"
        min="0"
        step="any"
        type="number"
        value={value}
        placeholder={loadType === 'bodyweightAdded' ? '自重' : '0'}
        onChange={(event) => {
          const next = event.target.value
          setValue(next)
          if (next.trim() === '') {
            onChange(undefined)
            return
          }
          const parsed = Number(next)
          if (Number.isFinite(parsed) && parsed >= 0) onChange(fromDisplayWeight(parsed, unit))
        }}
        onBlur={() => {
          if (loadType === 'bodyweightAdded' && Number(value) === 0) {
            setValue('')
            onChange(undefined)
          }
        }}
      />
      <span>{hasAdditionalWeight ? unit : ''}</span>
    </div>
  )
}

function RepsInput({
  set,
  disabled,
  onChange
}: {
  set: WorkoutSet
  disabled: boolean
  onChange: (reps: number) => void
}) {
  const [value, setValue] = useState(String(set.reps))
  useEffect(() => setValue(String(set.reps)), [set.reps])

  return (
    <input
      aria-label={`セット${set.order + 1}の回数`}
      className="number-input reps-input"
      disabled={disabled}
      inputMode="numeric"
      min="0"
      step="1"
      type="number"
      value={value}
      onChange={(event) => {
        const next = event.target.value
        setValue(next)
        if (next.trim() === '') return
        const parsed = Number(next)
        if (Number.isInteger(parsed) && parsed >= 0) onChange(parsed)
      }}
      onBlur={() => {
        if (value.trim() === '') {
          setValue('0')
          onChange(0)
        }
      }}
    />
  )
}

export function ExerciseSetEditor({
  exercise,
  sets,
  previous,
  unit,
  editable = true,
  onCopyPrevious,
  onAddSet,
  onUpdateSet,
  onDuplicateSet,
  onDeleteSet,
  onMoveSet,
  onMoveExercise,
  onRemoveExercise,
  canMoveExerciseUp,
  canMoveExerciseDown
}: ExerciseSetEditorProps) {
  const sortedSets = [...sets].sort((a, b) => a.order - b.order)

  return (
    <section className="workout-exercise" aria-labelledby={`exercise-${exercise.id}`}>
      <div className="workout-exercise__header">
        <div>
          <p className="eyebrow">{exercise.equipmentDetail ?? ''}</p>
          <h2 id={`exercise-${exercise.id}`}>{exercise.name}</h2>
        </div>
        {editable && (
          <div className="compact-actions" aria-label="種目操作">
            <button
              className="icon-button"
              type="button"
              aria-label={`${exercise.name}を上へ`}
              disabled={!canMoveExerciseUp}
              onClick={() => void onMoveExercise('up')}
            >
              <ArrowUp size={18} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label={`${exercise.name}を下へ`}
              disabled={!canMoveExerciseDown}
              onClick={() => void onMoveExercise('down')}
            >
              <ArrowDown size={18} />
            </button>
            <button
              className="icon-button danger-plain"
              type="button"
              aria-label={`${exercise.name}を削除`}
              onClick={() => void onRemoveExercise()}
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="previous-block">
        <div className="previous-block__heading">
          <strong>{previous ? `前回 ${previous.dateLabel}` : '前回記録なし'}</strong>
          {editable && previous && previous.sets.length > 0 && (
            <button className="text-button" type="button" onClick={() => void onCopyPrevious()}>
              前回をコピー
            </button>
          )}
        </div>
        {previous && previous.sets.length > 0 && (
          <ol className="previous-sets">
            {[...previous.sets]
              .sort((a, b) => a.order - b.order)
              .map((set) => <li key={set.id}>{formatWorkoutSet(set, exercise.loadType, unit)}</li>)}
          </ol>
        )}
      </div>

      <div className="set-grid set-grid--heading" aria-hidden="true">
        <span>SET</span>
        <span>{exercise.loadType === 'assisted' ? `補助 ${unit}` : exercise.loadType === 'bodyweight' ? '負荷' : unit}</span>
        <span>reps</span>
      </div>

      {sortedSets.length === 0 ? (
        <p className="inline-empty">セットを追加してください</p>
      ) : (
        <ol className="set-list">
          {sortedSets.map((set, index) => (
            <li className="set-row" key={set.id}>
              <div className="set-grid">
                <strong className="set-number">{index + 1}</strong>
                <WeightInput
                  disabled={!editable}
                  loadType={exercise.loadType}
                  set={set}
                  unit={unit}
                  onChange={(weightKg) => void onUpdateSet(set.id, { weightKg })}
                />
                <RepsInput
                  disabled={!editable}
                  set={set}
                  onChange={(reps) => void onUpdateSet(set.id, { reps })}
                />
              </div>
              {editable && (
                <div className="set-row__actions">
                  <button type="button" aria-label={`セット${index + 1}を複製`} onClick={() => void onDuplicateSet(set.id)}>
                    <Copy size={17} /> 複製
                  </button>
                  <button type="button" aria-label={`セット${index + 1}を上へ`} disabled={index === 0} onClick={() => void onMoveSet(set.id, 'up')}>
                    <ArrowUp size={17} />
                  </button>
                  <button type="button" aria-label={`セット${index + 1}を下へ`} disabled={index === sortedSets.length - 1} onClick={() => void onMoveSet(set.id, 'down')}>
                    <ArrowDown size={17} />
                  </button>
                  <button className="danger-plain" type="button" aria-label={`セット${index + 1}を削除`} onClick={() => void onDeleteSet(set.id)}>
                    <Trash2 size={17} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {editable && (
        <button className="add-set-button" type="button" onClick={() => void onAddSet()}>
          <Plus size={19} /> セット追加
        </button>
      )}
    </section>
  )
}
