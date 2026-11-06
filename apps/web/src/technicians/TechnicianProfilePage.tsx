import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { formatDate } from './format'
import { OpenJobsList } from './OpenJobsList'
import {
  NotAdminError,
  techniciansApi,
  ValidationError,
  type Job,
  type Technician,
  type TechnicianProfile,
  type TechniciansApi,
  type WorkingDay,
} from './techniciansApi'
import { TechniciansShell } from './TechniciansShell'
import { WeeklyHoursForm } from './WeeklyHoursForm'

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'hours', label: 'Weekly hours' },
  { id: 'off', label: 'Days off' },
  { id: 'jobs', label: 'Open jobs' },
] as const
type TabId = (typeof TABS)[number]['id']

export function TechnicianProfilePage({ id, api = techniciansApi }: { id: string; api?: TechniciansApi }) {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [assignable, setAssignable] = useState<Technician[]>([])
  const [attention, setAttention] = useState<Job[]>([])
  const [error, setError] = useState<'load' | 'not-admin' | null>(null)
  const [tab, setTab] = useState<TabId>('profile')
  const [confirming, setConfirming] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [hoursMessage, setHoursMessage] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const deactivateTrigger = useRef<HTMLButtonElement>(null)

  const load = useCallback(async () => {
    try {
      const [p, j, a] = await Promise.all([api.getTechnician(id), api.listJobsHeldBy(id), api.listAssignableTechnicians()])
      setProfile(p)
      setJobs(j)
      setAssignable(a.filter((t) => t.id !== id))
      setError(null)
    } catch (e) {
      setError(e instanceof NotAdminError ? 'not-admin' : 'load')
    }
  }, [api, id])

  useEffect(() => {
    void load()
  }, [load])

  function closeConfirm() {
    setConfirming(false)
    deactivateTrigger.current?.focus()
  }

  /** Runs an admin action; a refusal or failure is shown to the user instead of escaping as an unhandled rejection. */
  async function attempt(action: () => Promise<void>, failure: string) {
    try {
      await action()
    } catch (err) {
      if (err instanceof NotAdminError) setError('not-admin')
      else setToast(err instanceof ValidationError ? err.message : failure)
    }
  }

  async function deactivate() {
    await attempt(async () => {
      const res = await api.deactivateTechnician(id)
      setAttention(res.jobsNeedingReassignment)
      setToast('Technician deactivated')
      await load()
    }, 'The technician could not be deactivated. Try again.')
    closeConfirm()
  }

  const activate = () =>
    attempt(async () => {
      await api.activateTechnician(id)
      setAttention([])
      setToast('Technician activated')
      await load()
    }, 'The technician could not be activated. Try again.')

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const v = (k: string) => String(data.get(k) ?? '').trim()
    try {
      await api.updateProfile(id, {
        name: v('name'),
        loginEmail: v('loginEmail'),
        phone: v('phone'),
        serviceArea: v('serviceArea'),
        notes: v('notes'),
      })
      setProfileErrors({})
      setToast('Profile saved')
      await load()
    } catch (err) {
      if (err instanceof NotAdminError) setError('not-admin')
      else if (err instanceof ValidationError) setProfileErrors(err.errors)
      else setToast('The profile could not be saved. Try again.')
    }
  }

  async function saveHours(days: WorkingDay[]): Promise<Record<number, string>> {
    setHoursMessage(null)
    try {
      await api.saveWeeklyHours(id, days)
      setToast('Weekly hours saved')
      await load()
      return {}
    } catch (err) {
      if (err instanceof ValidationError) {
        setHoursMessage(err.message)
        await load()
        return Object.fromEntries(Object.entries(err.errors).map(([k, msg]) => [Number(k), msg]))
      }
      if (err instanceof NotAdminError) setError('not-admin')
      else setHoursMessage('The weekly hours could not be saved. Try again.')
      return { [-1]: 'Not saved' }
    }
  }

  const markDayOff = () =>
    attempt(async () => {
      if (!date) return
      const res = await api.markDayOff(id, date)
      setAttention(res.jobsNeedingReassignment)
      setDate('')
      await load()
    }, 'The day off could not be saved. Try again.')

  const removeDay = (day: string) =>
    attempt(async () => {
      await api.removeDayOff(id, day)
      await load()
    }, 'The day off could not be removed. Try again.')

  const reassign = (jobId: string, technicianId: string) =>
    attempt(async () => {
      await api.reassignJob(jobId, technicianId)
      setAttention((a) => a.filter((j) => j.id !== jobId))
      setToast('Job reassigned')
      await load()
    }, 'The job could not be reassigned. Try again.')

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = TABS[(TABS.findIndex((t) => t.id === tab) + step + TABS.length) % TABS.length]
    setTab(next.id)
    document.getElementById(`tab-${next.id}`)?.focus()
  }

  if (error || !profile) {
    return (
      <TechniciansShell>
        {error === 'not-admin' ? (
          <div className="alert alert-danger" role="alert">
            Only an admin can manage technicians. Sign in as an admin to continue.
          </div>
        ) : error === 'load' ? (
          <div className="alert alert-danger" role="alert">
            The technician could not be loaded.{' '}
            <button type="button" className="btn btn-secondary" onClick={() => void load()}>
              Try again
            </button>
          </div>
        ) : (
          <div aria-busy="true" aria-label="Loading technician" className="stack">
            <div className="skeleton" style={{ height: 'var(--control-height-md)' }} />
            <div className="skeleton" style={{ height: 'var(--control-height-md)' }} />
          </div>
        )}
      </TechniciansShell>
    )
  }

  const needing = attention

  return (
    <TechniciansShell>
      <div className="stack">
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <div className="cluster">
            <h1 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">{profile.name}</h1>
            <span className={profile.active ? 'badge badge-success' : 'badge'}>{profile.active ? 'Active' : 'Inactive'}</span>
          </div>
          {profile.active ? (
            <button ref={deactivateTrigger} type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>
              Deactivate
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => void activate()}>
              Activate
            </button>
          )}
        </div>

        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}

        {needing.length > 0 && (
          <div className="alert alert-warning" role="status">
            <h2 className="text-lg">Needs reassignment</h2>
            <p>
              {profile.name} still holds {needing.length} open {needing.length === 1 ? 'job' : 'jobs'}. They stay assigned until you
              reassign them.
            </p>
            <OpenJobsList scope="attention" jobs={needing} holderName={profile.name} choices={assignable} onReassign={reassign} />
          </div>
        )}

        <div className="tabs" role="tablist" aria-label="Technician sections" onKeyDown={onTabKey}>
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              className="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'jobs' && <span className="badge">{jobs.length}</span>}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile" className="stack">
            <dl aria-label="Saved profile" className="stack-sm">
              <div><dt className="text-muted">Full name</dt><dd>{profile.name}</dd></div>
              <div><dt className="text-muted">Login email</dt><dd>{profile.loginEmail}</dd></div>
              <div><dt className="text-muted">Phone</dt><dd>{profile.phone ?? 'Not set'}</dd></div>
              <div><dt className="text-muted">Service area</dt><dd>{profile.serviceArea ?? 'Not set'}</dd></div>
              <div><dt className="text-muted">Notes</dt><dd>{profile.notes ?? 'Not set'}</dd></div>
            </dl>
            <form key={JSON.stringify(profile)} onSubmit={saveProfile} noValidate className="stack">
              {(
                [
                  ['name', 'Full name', profile.name],
                  ['loginEmail', 'Login email', profile.loginEmail],
                  ['phone', 'Phone', profile.phone],
                  ['serviceArea', 'Service area', profile.serviceArea],
                  ['notes', 'Notes', profile.notes],
                ] as const
              ).map(([name, label, value]) => (
                <div className="field" key={name}>
                  <label htmlFor={`edit-${name}`}>{label}</label>
                  <input
                    id={`edit-${name}`}
                    name={name}
                    className={profileErrors[name] ? 'input is-invalid' : 'input'}
                    aria-invalid={profileErrors[name] ? true : undefined}
                    defaultValue={value ?? ''}
                  />
                  {profileErrors[name] && <p className="field-error">{profileErrors[name]}</p>}
                </div>
              ))}
              <div>
                <button type="submit" className="btn btn-secondary">
                  Save profile
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'hours' && (
          <div role="tabpanel" id="panel-hours" aria-labelledby="tab-hours" className="stack">
            {hoursMessage && (
              <div className="alert alert-danger" role="alert">
                {hoursMessage}. The saved schedule is shown below.
              </div>
            )}
            <WeeklyHoursForm saved={profile.workingHours} onSave={saveHours} />
          </div>
        )}

        {tab === 'off' && (
          <div role="tabpanel" id="panel-off" aria-labelledby="tab-off" className="stack">
            <div className="cluster">
              <div className="field">
                <label htmlFor="day-off-date">Day off</label>
                <input id="day-off-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <button type="button" className="btn btn-secondary" disabled={!date} onClick={() => void markDayOff()}>
                Mark day off
              </button>
            </div>
            {profile.daysOff.length === 0 ? (
              <div className="empty-state">
                <p>No days off marked. Pick a date to mark this technician as off.</p>
              </div>
            ) : (
              <ul aria-label="Days off" className="stack-sm" style={{ listStyle: 'none', padding: 0 }}>
                {profile.daysOff.map((d) => (
                  <li key={d} className="cluster">
                    <span>{formatDate(d)}</span>
                    <button type="button" className="btn btn-ghost" aria-label={`Remove day off ${formatDate(d)}`} onClick={() => void removeDay(d)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'jobs' && (
          <div role="tabpanel" id="panel-jobs" aria-labelledby="tab-jobs" className="stack">
            {jobs.length === 0 ? (
              <div className="empty-state">
                <p>{profile.name} holds no open jobs.</p>
              </div>
            ) : (
              <OpenJobsList scope="jobs" jobs={jobs} holderName={profile.name} choices={assignable} onReassign={reassign} />
            )}
          </div>
        )}
      </div>

      {confirming && (
        <>
          <div className="backdrop" onClick={closeConfirm} />
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="deactivate-title">
            <div className="stack">
              <h2 id="deactivate-title">Deactivate {profile.name}?</h2>
              <p>
                They will no longer be offered for new jobs. Jobs they already hold stay assigned until you reassign them.
              </p>
              <div className="cluster">
                <button type="button" className="btn btn-secondary" onClick={closeConfirm}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={() => void deactivate()}>
                  Deactivate technician
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </TechniciansShell>
  )
}
