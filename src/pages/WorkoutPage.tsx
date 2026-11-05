import { SessionEditor } from '../features/workout/SessionEditor'
import type { AppSettings } from '../types/models'

export interface WorkoutPageProps {
  sessionId: string
  unit: AppSettings['unit']
  onBack: () => void
  onCompleted: (sessionId: string) => void
  onDeleted: () => void
  onError: (message: string, error?: unknown) => void
}

export function WorkoutPage({
  sessionId,
  unit,
  onBack,
  onCompleted,
  onDeleted,
  onError
}: WorkoutPageProps) {
  return (
    <SessionEditor
      sessionId={sessionId}
      unit={unit}
      onBack={onBack}
      onComplete={onCompleted}
      onDeleted={onDeleted}
      onError={onError}
    />
  )
}
