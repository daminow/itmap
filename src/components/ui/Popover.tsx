import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export interface PopoverProps {
  label: ReactNode
  active?: boolean
  /** Extra class for the dropdown panel (e.g. to widen it or enable scrolling). */
  panelClassName?: string
  children: ReactNode | ((close: () => void) => ReactNode)
}

export function Popover({ label, active, panelClassName = '', children }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="popover" ref={ref}>
      <button
        type="button"
        className={`popover__trigger ${active ? 'popover__trigger--active' : ''}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div className={`popover__panel ${panelClassName}`} id={id} role="group">
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  )
}
