import { useEffect, useState } from 'react'

const formatClock = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

// Home and sound are drawn but inactive in this story: no handlers on purpose.
export function StatusBar() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="status-bar" data-wf-id="status-bar">
      <div className="top-icons" data-wf-id="top-icons">
        <button type="button" className="btn btn-ghost btn-icon btn-lg" aria-label="Home">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <path d="M9 22V12h6v10" />
          </svg>
        </button>
        <button type="button" className="btn btn-ghost btn-icon btn-lg" aria-label="Sound">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            <path d="M16 9a4 4 0 010 6" />
          </svg>
        </button>
      </div>
      <h1 className="game-title">Flaming Hot Gold™</h1>
      <span className="clock">{formatClock(now)}</span>
    </header>
  )
}
