import { useCallback, useEffect, useState } from 'react'
import { CreateTechnicianModal } from './CreateTechnicianModal'
import { formatDate, formatWorkingDays } from './format'
import { NotAdminError, techniciansApi, type NewTechnicianInput, type TechniciansApi, type TechnicianSummary } from './techniciansApi'
import { TechniciansShell } from './TechniciansShell'

type Filter = 'all' | 'active' | 'inactive'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
]

export function TechniciansPage({ api = techniciansApi }: { api?: TechniciansApi }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [rows, setRows] = useState<TechnicianSummary[] | null>(null)
  const [error, setError] = useState<'load' | 'not-admin' | null>(null)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setRows(null)
    try {
      setRows(await api.listTechnicians(filter === 'all' ? undefined : filter))
    } catch (e) {
      setError(e instanceof NotAdminError ? 'not-admin' : 'load')
    }
  }, [api, filter])

  useEffect(() => {
    void load()
  }, [load])

  async function create(input: NewTechnicianInput) {
    const t = await api.createTechnician(input)
    setCreating(false)
    setToast(`${t.name} created and shown as active`)
    await load()
  }

  const notAdmin = error === 'not-admin'

  return (
    <TechniciansShell>
      <div className="stack">
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <h1 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">Technicians</h1>
          <button
            type="button"
            className="btn btn-primary"
            aria-disabled={notAdmin || undefined}
            onClick={() => !notAdmin && setCreating(true)}
          >
            New technician
          </button>
        </div>

        {notAdmin && (
          <div className="alert alert-danger" role="alert">
            Only an admin can manage technicians. Sign in as an admin to continue.
          </div>
        )}
        {error === 'load' && (
          <div className="alert alert-danger" role="alert">
            The technicians could not be loaded.{' '}
            <button type="button" className="btn btn-secondary" onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}

        <div className="cluster" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={filter === f.id ? 'chip is-selected' : 'chip'}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {rows === null && !error && (
          <div aria-busy="true" aria-label="Loading technicians" className="stack">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 'var(--control-height-md)' }} />
            ))}
          </div>
        )}
        {rows?.length === 0 && (
          <div className="empty-state">
            <p>No technicians here yet. Technicians you create can be assigned jobs.</p>
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Create the first technician
            </button>
          </div>
        )}
        {rows && rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Working days</th>
                  <th>Open jobs</th>
                  <th>Next day off</th>
                  <th>
                    <span className="sr-only">Manage</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>
                      <span className={t.active ? 'badge badge-success' : 'badge'}>{t.active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td>{formatWorkingDays(t.workingDays)}</td>
                    <td>{t.openJobCount}</td>
                    <td>{t.nextDayOff ? formatDate(t.nextDayOff) : 'None'}</td>
                    <td>
                      <a className="btn btn-ghost" href={`#/technicians/${t.id}`} aria-label={`Manage ${t.name}`}>
                        Manage
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {creating && <CreateTechnicianModal onCreate={create} onClose={() => setCreating(false)} />}
    </TechniciansShell>
  )
}
