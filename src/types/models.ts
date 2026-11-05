export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'other'
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背中',
  shoulders: '肩',
  biceps: '上腕二頭筋',
  triceps: '上腕三頭筋',
  forearms: '前腕',
  quadriceps: '大腿四頭筋',
  hamstrings: 'ハムストリング',
  glutes: '臀部',
  calves: 'ふくらはぎ',
  core: '腹部・体幹',
  other: 'その他'
}

export const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'smithMachine',
  'weightStack',
  'plateLoaded',
  'cable',
  'bodyweight',
  'other'
] as const

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number]

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  barbell: 'バーベル',
  dumbbell: 'ダンベル',
  smithMachine: 'スミスマシン',
  weightStack: 'ウェイトスタック',
  plateLoaded: 'プレートロード',
  cable: 'ケーブル',
  bodyweight: '自重',
  other: 'その他'
}

export type LoadType = 'weighted' | 'bodyweight' | 'bodyweightAdded' | 'assisted'

export interface Exercise {
  id: string
  name: string
  aliases: string[]
  primaryMuscle: MuscleGroup
  secondaryMuscles: MuscleGroup[]
  equipment: EquipmentType
  equipmentDetail?: string
  loadType: LoadType
  isBuiltIn: boolean
  isFavorite: boolean
  favoriteOrder?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkoutSession {
  id: string
  startedAt: string
  endedAt?: string
  status: 'active' | 'completed'
  note: string
  createdAt: string
  updatedAt: string
}

export interface SessionExercise {
  id: string
  sessionId: string
  exerciseId: string
  order: number
  createdAt: string
}

export interface WorkoutSet {
  id: string
  sessionId: string
  sessionExerciseId: string
  exerciseId: string
  order: number
  weightKg?: number
  reps: number
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  id: 'app'
  unit: 'kg' | 'lb'
  theme: 'system' | 'light' | 'dark'
  installHintDismissed?: boolean
}

export interface SessionBundle {
  session: WorkoutSession
  sessionExercises: SessionExercise[]
  sets: WorkoutSet[]
}

export type AppTab = 'home' | 'history' | 'exercises' | 'analytics'

export type AppView =
  | { type: 'tab'; tab: AppTab }
  | { type: 'workout'; sessionId: string }
  | { type: 'historyDetail'; sessionId: string }
  | { type: 'exerciseDetail'; exerciseId: string }
  | { type: 'settings' }
  | { type: 'summary'; sessionId: string }

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `gym-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
