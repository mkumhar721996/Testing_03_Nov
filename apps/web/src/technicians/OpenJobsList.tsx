import { useState } from 'react'
import { formatDate } from './format'
import type { Job, Technician } from './techniciansApi'

interface Props {
  /** Keeps element ids unique when the list is rendered twice on one screen. */
  scope: string
  jobs: Job[]
  /** Technician who holds these jobs; shown as each job's assigned technician. */
  holderName: string
  /** Active technicians other than the holder. */
  choices: Technician[]
  onReassign: (jobId: string, technicianId: string) => Promise<void>
}

export function OpenJobsList({ scope, jobs, holderName, choices, onReassign }: Props) {
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  async function reassign(jobId: string) {
    setBusy(jobId)
    try {
      await onReassign(jobId, picked[jobId])
    } finally {
      setBusy(null)
    }
  }

  return (
    <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
      {jobs.map((job) => (
        <li key={job.id} className="card stack-sm">
          <strong>{job.title}</strong>
          <span className="text-muted">
            {job.customer} · {formatDate(job.scheduledDate)}
            {job.scheduledTime ? ` ${job.scheduledTime}` : ''}
          </span>
          <span>
            Assigned technician: <strong>{holderName}</strong>
          </span>
          <div className="cluster">
            <label className="text-sm" htmlFor={`${scope}-reassign-${job.id}`}>
              Reassign {job.title} to
            </label>
            <select
              id={`${scope}-reassign-${job.id}`}
              className="input"
              value={picked[job.id] ?? ''}
              onChange={(e) => setPicked({ ...picked, [job.id]: e.target.value })}
            >
              <option value="">Choose a technician</option>
              {choices.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-secondary"
              aria-label={`Reassign ${job.title}`}
              disabled={!picked[job.id] || busy === job.id}
              onClick={() => void reassign(job.id)}
            >
              Reassign
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
