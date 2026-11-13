import { useEffect, useRef, useState } from 'react'
import { TechniciansShell } from '../technicians/TechniciansShell'
import { AssignDrawer } from './AssignDrawer'
import { bookingsApi, LockedError, NotAdminError, type Booking, type BookingsApi, type Notification } from './bookingsApi'
import { bookingRef, formatDay, isLocked, statusLabel } from './format'
import { useBookings } from './useBookings'

interface BookingsPageProps {
  api?: BookingsApi
}

type Tab = 'unassigned' | 'assigned'

interface Log {
  title: string
  lines: string[]
}

const NOT_ADMIN = 'Only admins can assign technicians.'

export function BookingsPage({ api = bookingsApi }: BookingsPageProps) {
  const { unassigned, assigned, names, loading, error, setError, reload, retry } = useBookings(api)
  const [tab, setTab] = useState<Tab>('unassigned')
  const [editing, setEditing] = useState<Booking | null>(null)
  const [log, setLog] = useState<Log | null>(null)
  const [refusal, setRefusal] = useState<{ title: string; text: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const trigger = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const nameOf = (id: string | null) => (id ? (names[id] ?? 'Unknown technician') : '')

  function close() {
    setEditing(null)
    trigger.current?.focus()
  }

  function refuse(b: Booking) {
    const title = `${bookingRef(b)} can’t be reassigned while it is ${statusLabel(b.status).toLowerCase()}.`
    const text = `It still shows ${nameOf(b.technicianId)} as its technician and nothing was changed.`
    setLog(null)
    setRefusal({ title, text })
    setToast(`Refused: ${bookingRef(b)} is ${statusLabel(b.status).toLowerCase()}. ${nameOf(b.technicianId)} keeps it.`)
  }

  function open(b: Booking, from: HTMLElement) {
    setRefusal(null)
    if (isLocked(b)) {
      refuse(b)
      return
    }
    trigger.current = from
    setLog(null)
    setEditing(b)
  }

  async function onAssign(b: Booking, technicianId: string) {
    const previous = b.technicianId
    try {
      const result = await api.assignTechnician(b.id, technicianId)
      const ref = bookingRef(b)
      const next = nameOf(technicianId)
      const line = (n: Notification) =>
        n.kind === 'assigned'
          ? `${nameOf(n.technicianId)} was notified of the assignment.`
          : `${nameOf(n.technicianId)} was notified that ${ref} was removed from them.`
      setRefusal(null)
      setLog({
        title: previous ? `${ref} reassigned from ${nameOf(previous)} to ${next}.` : `${ref} assigned to ${next}.`,
        lines: result.notified.map(line),
      })
      setToast(`${ref} ${previous ? 'reassigned to' : 'assigned to'} ${next}`)
      close()
      await reload()
    } catch (err) {
      close()
      if (err instanceof NotAdminError) {
        setError('not-admin')
      } else if (err instanceof LockedError) {
        const fresh = await reload()
        const current = fresh?.assigned.find((x) => x.id === b.id) ?? b
        refuse(isLocked(current) ? current : { ...b, status: 'locked' })
      } else {
        setRefusal({
          title: `${bookingRef(b)} was not changed.`,
          text: err instanceof Error ? err.message : 'Try again.',
        })
      }
    }
  }

  const rows = tab === 'unassigned' ? unassigned : assigned

  return (
    <TechniciansShell section="items">
      <main className="mx-auto flex w-full max-w-[var(--content-max-width)] flex-col gap-[var(--space-4)] text-[var(--color-fg)]">
        <h1 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">Bookings</h1>

        {error === 'not-admin' && (
          <div className="alert alert-danger" role="alert">
            <div>
              <strong>{NOT_ADMIN}</strong> Assigning and reassigning are refused for your account, and every booking
              keeps its current technician. Ask an admin to make the change.
            </div>
          </div>
        )}
        {error === 'failed' && (
          <div className="alert alert-danger" role="alert">
            <div className="stack stack-sm">
              <div>
                <strong>The bookings didn&apos;t load.</strong> Check your connection and try again. No technician has
                changed.
              </div>
              <div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="stack stack-sm" aria-busy="true" aria-label="Loading bookings">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="skeleton min-h-[var(--control-height-lg)]" />
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="stack">
            {log && (
              <div className="alert alert-success" role="status">
                <div className="stack stack-sm">
                  <strong>{log.title}</strong>
                  <ul className="m-0 list-none p-0">
                    {log.lines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {refusal && (
              <div className="alert alert-danger" role="alert">
                <div>
                  <strong>{refusal.title}</strong> <span>{refusal.text}</span>
                </div>
              </div>
            )}

            <div className="tabs" role="tablist" aria-label="Booking lists">
              {(['unassigned', 'assigned'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  id={`tab-${t}`}
                  className="tab"
                  aria-selected={tab === t}
                  aria-controls="bookings-panel"
                  onClick={() => setTab(t)}
                >
                  {t === 'unassigned' ? 'Unassigned' : 'Assigned'}{' '}
                  <span className={`badge${t === 'unassigned' ? ' badge-warning' : ''}`}>
                    {t === 'unassigned' ? unassigned.length : assigned.length}
                  </span>
                </button>
              ))}
            </div>

            <section id="bookings-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="stack">
              {tab === 'assigned' && (
                <p className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
                  Reassign is available while a booking is assigned. Once the technician is on the way, in progress or
                  completed, it stays with them.
                </p>
              )}
              {rows.length === 0 && tab === 'unassigned' ? (
                <div className="empty-state">
                  <h2>Every booking has a technician</h2>
                  <p>
                    New bookings without a technician appear here until you assign one. Assigned bookings are on the
                    Assigned tab.
                  </p>
                  <button type="button" className="btn btn-secondary" onClick={() => setTab('assigned')}>
                    View assigned bookings
                  </button>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <caption className="px-[var(--space-3)] py-[var(--space-2)] text-left text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
                      {tab === 'unassigned'
                        ? 'Bookings without a technician, soonest first'
                        : 'Bookings with a technician, with status'}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Booking</th>
                        <th scope="col">Customer</th>
                        <th scope="col">Scheduled</th>
                        {tab === 'assigned' && <th scope="col">Assigned technician</th>}
                        <th scope="col">Status</th>
                        <th scope="col">
                          <span className="text-[length:var(--font-size-sm)]">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((b) => (
                        <tr key={b.id}>
                          <td className="font-[var(--font-weight-bold)]">{bookingRef(b)}</td>
                          <td>{b.customerId}</td>
                          <td>
                            {formatDay(b.day)}, {b.window}
                          </td>
                          {tab === 'assigned' && <td>{nameOf(b.technicianId)}</td>}
                          <td>
                            {b.technicianId ? (
                              <span className={`badge${b.status === 'completed' ? ' badge-success' : ''}`}>
                                {statusLabel(b.status)}
                              </span>
                            ) : (
                              <span className="badge badge-warning">Unassigned</span>
                            )}
                          </td>
                          <td>
                            {b.technicianId ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                aria-label={`Reassign ${bookingRef(b)}`}
                                onClick={(e) => open(b, e.currentTarget)}
                              >
                                Reassign
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                aria-label={`Assign technician to ${bookingRef(b)}`}
                                onClick={(e) => open(b, e.currentTarget)}
                              >
                                Assign technician
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {editing && (
          <AssignDrawer
            api={api}
            booking={editing}
            currentName={editing.technicianId ? nameOf(editing.technicianId) : null}
            onSubmit={(technicianId) => onAssign(editing, technicianId)}
            onClose={close}
          />
        )}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </main>
    </TechniciansShell>
  )
}
