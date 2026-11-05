import { useRef, useState } from 'react'
import { AutoplayMenu } from './AutoplayMenu'

interface ControlBarProps {
  spinning: boolean
  canSpin: boolean
  auto: { on: boolean; left: number }
  turbo: boolean
  onSpin: () => void
  onStartAutoplay: (count: number) => void
  onStopAutoplay: () => void
  onToggleTurbo: () => void
  onOpenInfo: () => void
  infoRef?: React.Ref<HTMLButtonElement>
}

export function ControlBar({
  spinning,
  canSpin,
  auto,
  turbo,
  onSpin,
  onStartAutoplay,
  onStopAutoplay,
  onToggleTurbo,
  onOpenInfo,
  infoRef,
}: ControlBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const autoRef = useRef<HTMLButtonElement>(null)
  const busy = spinning || auto.on

  function closeMenu() {
    setMenuOpen(false)
    autoRef.current?.focus()
  }

  return (
    <>
      <div className="control-bar" data-wf-id="control-bar">
        <button
          ref={infoRef}
          type="button"
          className="btn btn-secondary btn-icon btn-lg"
          aria-label="Info: paytable and rules"
          onClick={onOpenInfo}
        >
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </button>
        <button type="button" className="btn btn-secondary btn-icon btn-lg" aria-label="Menu">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>
        <button
          type="button"
          className={`btn btn-primary spin-button${spinning ? ' is-busy' : ''}`}
          disabled={!busy && !canSpin}
          aria-disabled={busy}
          onClick={() => !busy && onSpin()}
        >
          <span>{spinning ? 'Spinning' : 'Spin'}</span>
        </button>
        <button
          ref={autoRef}
          type="button"
          className={`btn btn-secondary stacked${auto.on ? ' is-on' : ''}`}
          aria-label={auto.on ? `Stop autoplay, ${auto.left} spins left` : 'Autoplay'}
          aria-haspopup={auto.on ? undefined : 'menu'}
          aria-expanded={auto.on ? undefined : menuOpen}
          disabled={!auto.on && (spinning || !canSpin)}
          onClick={() => (auto.on ? onStopAutoplay() : setMenuOpen((o) => !o))}
        >
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.22-8.56" />
          </svg>
          <span className="cap">{auto.on ? `${auto.left} left` : 'Auto'}</span>
        </button>
        <button
          type="button"
          id="turbo-btn"
          className={`btn btn-secondary stacked${turbo ? ' is-on' : ''}`}
          aria-pressed={turbo}
          onClick={onToggleTurbo}
        >
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" />
          </svg>
          <span className="cap">{turbo ? 'Turbo on' : 'Turbo off'}</span>
        </button>
      </div>
      {menuOpen && !auto.on && (
        <AutoplayMenu
          onClose={closeMenu}
          onPick={(count) => {
            setMenuOpen(false)
            onStartAutoplay(count)
          }}
        />
      )}
    </>
  )
}
