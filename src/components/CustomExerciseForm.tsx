import { useId, useState, type FormEvent } from 'react'
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  type EquipmentType,
  type LoadType,
  type MuscleGroup
} from '../types/models'

export interface CustomExerciseInput {
  name: string
  aliases: string[]
  primaryMuscle: MuscleGroup
  secondaryMuscles: MuscleGroup[]
  equipment: EquipmentType
  equipmentDetail?: string
  loadType: LoadType
}

interface CustomExerciseFormProps {
  onSubmit: (input: CustomExerciseInput) => void | Promise<void>
  onCancel: () => void
  onError?: (message: string) => void
}

const LOAD_TYPE_OPTIONS: Array<{ value: LoadType; label: string; hint: string }> = [
  { value: 'weighted', label: '通常重量', hint: '重量と回数を記録' },
  { value: 'bodyweight', label: '自重', hint: '回数のみ記録' },
  { value: 'bodyweightAdded', label: '自重＋追加重量', hint: '追加重量と回数を記録' },
  { value: 'assisted', label: 'アシスト', hint: '補助重量と回数を記録' }
]

export function CustomExerciseForm({ onSubmit, onCancel, onError }: CustomExerciseFormProps) {
  const formId = useId()
  const [name, setName] = useState('')
  const [aliases, setAliases] = useState('')
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>('other')
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([])
  const [equipment, setEquipment] = useState<EquipmentType>('other')
  const [equipmentDetail, setEquipmentDetail] = useState('')
  const [loadType, setLoadType] = useState<LoadType>('weighted')
  const [submitting, setSubmitting] = useState(false)

  const toggleSecondary = (muscle: MuscleGroup) => {
    setSecondaryMuscles((current) =>
      current.includes(muscle) ? current.filter((item) => item !== muscle) : [...current, muscle]
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      onError?.('種目名を入力してください')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        name: trimmedName,
        aliases: aliases.split(/[,\u3001\n]/).map((item) => item.trim()).filter(Boolean),
        primaryMuscle,
        secondaryMuscles: secondaryMuscles.filter((muscle) => muscle !== primaryMuscle),
        equipment,
        equipmentDetail: equipmentDetail.trim() || undefined,
        loadType
      })
    } catch (error) {
      console.error('カスタム種目の保存に失敗しました', error)
      onError?.('種目の保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form-stack" id={formId} onSubmit={submit}>
      <label className="field">
        <span>種目名 <em>必須</em></span>
        <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" required />
      </label>

      <label className="field">
        <span>別名 <small>任意・複数は「、」で区切る</small></span>
        <input value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder="例：チンニング、プルアップ" autoComplete="off" />
      </label>

      <label className="field">
        <span>主対象部位</span>
        <select value={primaryMuscle} onChange={(event) => setPrimaryMuscle(event.target.value as MuscleGroup)}>
          {MUSCLE_GROUPS.map((muscle) => <option value={muscle} key={muscle}>{MUSCLE_LABELS[muscle]}</option>)}
        </select>
      </label>

      <fieldset className="field fieldset-reset">
        <legend>補助対象部位 <small>任意</small></legend>
        <div className="choice-chips">
          {MUSCLE_GROUPS.filter((muscle) => muscle !== primaryMuscle).map((muscle) => (
            <label className="choice-chip" key={muscle}>
              <input type="checkbox" checked={secondaryMuscles.includes(muscle)} onChange={() => toggleSecondary(muscle)} />
              <span>{MUSCLE_LABELS[muscle]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>器具</span>
        <select value={equipment} onChange={(event) => setEquipment(event.target.value as EquipmentType)}>
          {EQUIPMENT_TYPES.map((item) => <option value={item} key={item}>{EQUIPMENT_LABELS[item]}</option>)}
        </select>
      </label>

      <label className="field">
        <span>器具の詳細 <small>任意</small></span>
        <input value={equipmentDetail} onChange={(event) => setEquipmentDetail(event.target.value)} placeholder="例：Hammer Select" autoComplete="off" />
      </label>

      <fieldset className="field fieldset-reset">
        <legend>重量タイプ</legend>
        <div className="radio-list">
          {LOAD_TYPE_OPTIONS.map((option) => (
            <label className="radio-row" key={option.value}>
              <input type="radio" name={`${formId}-load-type`} value={option.value} checked={loadType === option.value} onChange={() => setLoadType(option.value)} />
              <span><strong>{option.label}</strong><small>{option.hint}</small></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="form-actions form-actions--sticky">
        <button className="button button--secondary" type="button" onClick={onCancel} disabled={submitting}>キャンセル</button>
        <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? '保存中…' : '種目を追加'}</button>
      </div>
    </form>
  )
}

