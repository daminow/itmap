import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export interface ChipProps {
  children: ReactNode
  onRemove?: () => void
  onClick?: () => void
  active?: boolean
  removeLabel?: string
  className?: string
}

export function Chip({ children, onRemove, onClick, active, removeLabel, className = '' }: ChipProps) {
  const interactive = !!onClick
  return (
    <span
      className={`ui-chip ${active ? 'ui-chip--active' : ''} ${interactive ? 'ui-chip--btn' : ''} ${className}`}
      {...(interactive ? { role: 'button', tabIndex: 0, onClick, onKeyDown: keyActivate(onClick) } : {})}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          className="ui-chip__x"
          aria-label={removeLabel ?? 'Удалить'}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <X size={13} aria-hidden />
        </button>
      )}
    </span>
  )
}

function keyActivate(fn?: () => void) {
  return (e: React.KeyboardEvent) => {
    if (fn && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      fn()
    }
  }
}
