import { useState } from 'react'
import { Alert } from '../components/Alert'
import { Badge } from '../components/Badge'
import { fetchEmployee, fetchInvitation, resendInvitation } from './employeesApi'
import { InvitationPanel } from './InvitationPanel'
import { card, page, secondaryButton, skeleton, statusLabel } from './ui'
import { useLoad } from './useLoad'

const meta = 'mt-[var(--space-1)] text-[var(--color-fg-muted)] [overflow-wrap:anywhere]'

export function EmployeeCreatedPage({ id }: { id: string }) {
  const { state, retry, set } = useLoad(
    async (signal) => {
      const [employee, invitation] = await Promise.all([fetchEmployee(id, signal), fetchInvitation(id, signal)])
      return { employee, invitation }
    },
    id,
  )
  const [resending, setResending] = useState(false)
  const [justSent, setJustSent] = useState(false)

  async function resend() {
    if (state.status !== 'loaded') return
    setResending(true)
    try {
      const invitation = await resendInvitation(id)
      set({ ...state.value, invitation })
      setJustSent(invitation.status === 'sent')
    } catch {
      // The warning stays; HR can try again.
    } finally {
      setResending(false)
    }
  }

  return (
    <main aria-label="Employee" className={page}>
      <div className="flex flex-col gap-[var(--space-3)]">
        {state.status === 'loading' && (
          <div role="status" aria-live="polite" className="flex flex-col gap-[var(--space-2)]">
            <span className="sr-only">Loading the employee</span>
            <span className={`${skeleton} w-[40%]`} />
            <span className={`${skeleton} w-[70%]`} />
          </div>
        )}
        {state.status === 'error' && (
          <Alert variant="danger">
            <p>We couldn&apos;t load this employee. Check your connection and try again.</p>
            <div>
              <button type="button" onClick={retry} className={secondaryButton}>
                Retry
              </button>
            </div>
          </Alert>
        )}
        {state.status === 'loaded' && (
          <>
            <Alert variant="success">
              <p>
                <strong>Employee saved.</strong> {state.value.employee.name} was added. Status:{' '}
                {statusLabel(state.value.employee.status)}.
              </p>
            </Alert>
            <section aria-labelledby="employee-name" className={card}>
              <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
                <h1 id="employee-name" className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)]">
                  {state.value.employee.name}
                </h1>
                <Badge>{statusLabel(state.value.employee.status)}</Badge>
              </div>
              {justSent ? (
                <p className={meta}>Invitation: sent just now, valid for 14 days</p>
              ) : (
                <>
                  <p className={meta}>
                    {state.value.employee.jobTitle}, {state.value.employee.department}.
                    {state.value.employee.manager ? ` Manager: ${state.value.employee.manager}` : ''}
                  </p>
                  <p className={meta}>{state.value.employee.workEmail}</p>
                </>
              )}
            </section>
            <InvitationPanel
              invitation={state.value.invitation}
              email={state.value.employee.workEmail}
              resending={resending}
              justSent={justSent}
              onResend={resend}
            />
          </>
        )}
      </div>
    </main>
  )
}
