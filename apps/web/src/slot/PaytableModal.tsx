import { useEffect, useRef } from 'react'
import { PAYTABLE_ROWS, RULES } from './gameConfig'

interface PaytableModalProps {
  onClose: () => void
  returnFocusTo?: React.RefObject<HTMLElement | null>
}

export function PaytableModal({ onClose, returnFocusTo }: PaytableModalProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button')?.focus()
    const back = returnFocusTo?.current
    return () => back?.focus()
  }, [returnFocusTo])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <section
        ref={ref}
        className="modal paytable"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paytable-title"
        onKeyDown={onKeyDown}
      >
        <div className="paytable-head">
          <h2 id="paytable-title">Paytable and rules</h2>
          <button type="button" className="btn btn-ghost btn-icon btn-lg" aria-label="Close paytable and rules" onClick={onClose}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <h3>Line wins, multiples of your bet</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Symbol</th>
                <th scope="col" className="num">
                  3 in a row
                </th>
                <th scope="col" className="num">
                  4 in a row
                </th>
                <th scope="col" className="num">
                  5 in a row
                </th>
              </tr>
            </thead>
            <tbody>
              {PAYTABLE_ROWS.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.symbol}</th>
                  {row.pays.map((pay, i) => (
                    <td key={i} className="num">
                      {pay}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Rules</h3>
        <ul>
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Back to game
          </button>
        </div>
      </section>
    </>
  )
}
