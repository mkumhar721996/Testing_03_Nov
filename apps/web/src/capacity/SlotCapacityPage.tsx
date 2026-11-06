import { useEffect, useRef, useState } from 'react'
import { DayLimitDrawer } from './DayLimitDrawer'
import { capacityApi, type CapacityApi, type DayRow } from './capacityApi'
import { today, useSlotCapacity } from './useSlotCapacity'

interface SlotCapacityPageProps {
  api?: CapacityApi
}

function customersSee(row: DayRow) {
  if (row.limit === null) return { ok: false, text: 'Not bookable: no limit set' }
  if (row.booked >= row.limit) return { ok: false, text: 'Not bookable: fully booked' }
  return { ok: true, text: 'Bookable' }
}

export function SlotCapacityPage({ api = capacityApi }: SlotCapacityPageProps) {
  const { rows, loading, error, save, retry } = useSlotCapacity(api)
  const [editing, setEditing] = useState<string | null>(null)
  const [toast, setToast] = useState(false)
  const trigger = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(false), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  function open(day: string, from: HTMLElement) {
    trigger.current = from
    setEditing(day)
  }

  function close() {
    setEditing(null)
    trigger.current?.focus()
  }

  async function onSave(day: string, limit: number) {
    try {
      await save(day, limit)
    } catch (err) {
      close()
      throw err
    }
    setToast(true)
    close()
  }

  const days = rows.length ? rows.map((r) => r.day) : [today()]
  const editingRow = rows.find((r) => r.day === editing)

  return (
    <main className="mx-auto flex w-full max-w-[var(--content-max-width)] flex-col gap-[var(--space-4)] p-[var(--space-3)] text-[var(--color-fg)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
        <h1 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">Slot capacity</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={(e) => open(days[0], e.currentTarget)}
        >
          Set limit for a day
        </button>
      </div>
      <p className="text-[var(--color-fg-muted)]">
        The visit limit is the total for a day, across the windows 08:00-11:00, 11:00-14:00 and 14:00-17:00.
        Customers can only book a day that has a limit and places left.
      </p>

      {error === 'not-admin' && (
        <div className="alert alert-warning" role="alert">
          <p>Only admins can change visit limits</p>
        </div>
      )}
      {error === 'failed' && (
        <div className="alert alert-danger" role="alert">
          <p>The visit limits did not load. Check your connection and try again.</p>
          <button type="button" className="btn btn-secondary" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {loading && (
        <div aria-busy="true" className="stack">
          <p role="status">Loading visit limits</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="empty-state">
          <h2>No visit limits set</h2>
          <p>Set a limit so customers can book a day.</p>
          <button type="button" className="btn btn-secondary" onClick={(e) => open(days[0], e.currentTarget)}>
            Set limit for a day
          </button>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Visit limit</th>
                <th>Booked</th>
                <th>Places left</th>
                <th>Customers see</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const see = customersSee(row)
                return (
                  <tr key={row.day}>
                    <td>{row.day}</td>
                    <td>{row.limit === null ? 'Not set' : row.limit}</td>
                    <td>
                      {row.booked}
                      {row.limit !== null && row.booked > row.limit && (
                        <span className="badge badge-warning ml-[var(--space-2)]">Over limit</span>
                      )}
                    </td>
                    <td>{row.placesLeft}</td>
                    <td>
                      <span className={`badge ${see.ok ? 'badge-success' : 'badge-danger'}`}>{see.text}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={(e) => open(row.day, e.currentTarget)}
                      >
                        Set limit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <DayLimitDrawer
          api={api}
          days={days}
          initialDay={editing}
          initialLimit={editingRow?.limit ?? null}
          onSave={onSave}
          onClose={close}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          Visit limit saved
        </div>
      )}
    </main>
  )
}
