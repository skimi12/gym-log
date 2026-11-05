import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  eyebrow?: string
  onBack?: () => void
  trailing?: ReactNode
  compact?: boolean
}

export function PageHeader({ title, eyebrow, onBack, trailing, compact = false }: PageHeaderProps) {
  return (
    <header className={`page-header${compact ? ' page-header--compact' : ''}`}>
      <div className="page-header__leading">
        {onBack ? (
          <button className="icon-button page-header__back" type="button" onClick={onBack} aria-label="戻る">
            <ChevronLeft aria-hidden="true" />
          </button>
        ) : null}
        <div className="page-header__titles">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
        </div>
      </div>
      {trailing ? <div className="page-header__trailing">{trailing}</div> : null}
    </header>
  )
}

