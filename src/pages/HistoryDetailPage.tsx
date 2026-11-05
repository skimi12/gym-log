import { SessionEditor } from '../features/workout/SessionEditor'
import type { AppSettings } from '../types/models'

export interface HistoryDetailPageProps {
  sessionId: string
  unit: AppSettings['unit']
  onBack: () => void
  onDeleted: () => void
  onOpenExercise?: (exerciseId: string) => void
  onError: (message: string, error?: unknown) => void
}

export function HistoryDetailPage({
  sessionId,
  unit,
  onBack,
  onDeleted,
  onError
}: HistoryDetailPageProps) {
  return (
    <SessionEditor
      sessionId={sessionId}
      unit={unit}
      onBack={onBack}
      onDeleted={onDeleted}
      onError={onError}
    />
  )
}
