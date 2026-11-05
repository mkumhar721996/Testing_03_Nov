import { useEffect, useRef } from 'react'
import { AUTOPLAY_COUNTS } from './gameConfig'

interface AutoplayMenuProps {
  onPick: (count: number) => void
  onClose: () => void
}

export function AutoplayMenu({ onPick, onClose }: AutoplayMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const items = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

  useEffect(() => {
    items()[0]?.focus()
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    const list = items()
    const i = list.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      list[(i + 1) % list.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      list[(i - 1 + list.length) % list.length]?.focus()
    }
  }

  return (
    <div ref={ref} className="dropdown-menu autoplay-menu" role="menu" aria-label="Autoplay spins" onKeyDown={onKeyDown}>
      <div className="menu-title" role="presentation">
        Spins to play
      </div>
      {AUTOPLAY_COUNTS.map((count) => (
        <button key={count} type="button" className="dropdown-item" role="menuitem" onClick={() => onPick(count)}>
          {count} spins
        </button>
      ))}
    </div>
  )
}
