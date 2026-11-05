import { Star } from 'lucide-react'

interface FavoriteButtonProps {
  isFavorite: boolean
  exerciseName: string
  onToggle: () => void
  disabled?: boolean
  showLabel?: boolean
}

export function FavoriteButton({
  isFavorite,
  exerciseName,
  onToggle,
  disabled = false,
  showLabel = false
}: FavoriteButtonProps) {
  const label = isFavorite ? `${exerciseName}をお気に入りから外す` : `${exerciseName}をお気に入りに追加`
  return (
    <button
      className={`favorite-button${showLabel ? ' favorite-button--labeled' : ''}`}
      data-active={isFavorite || undefined}
      type="button"
      aria-label={label}
      aria-pressed={isFavorite}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      disabled={disabled}
    >
      <Star aria-hidden="true" size={20} fill={isFavorite ? 'currentColor' : 'none'} />
      {showLabel ? <span>{isFavorite ? 'お気に入り済み' : 'お気に入り'}</span> : null}
    </button>
  )
}

