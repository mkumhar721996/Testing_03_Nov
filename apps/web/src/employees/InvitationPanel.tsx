import { Alert } from '../components/Alert'
import type { InvitationView } from './employeesApi'
import { primaryButton, spinner } from './ui'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

interface Props {
  invitation: InvitationView
  email: string
  resending: boolean
  /** True after a resend or reissue succeeded in this session. */
  justSent: boolean
  onResend: () => void
}

export function InvitationPanel({ invitation, email, resending, justSent, onResend }: Props) {
  if (justSent) {
    return (
      <Alert variant="success">
        <p>
          <strong>Invitation sent.</strong> An invitation to sign in was sent to {email}.
        </p>
      </Alert>
    )
  }
  if (invitation.status !== 'not_delivered' && invitation.status !== 'expired') return null

  const expired = invitation.status === 'expired'
  return (
    <Alert variant="warning">
      <strong>{expired ? 'Invitation expired' : 'Invitation not delivered'}</strong>
      <p className="text-[var(--color-fg-muted)]">
        {expired
          ? `The invitation was sent on ${formatDate(invitation.sentAt)}, 14 days ago, and was not accepted, so it can no longer be used. Reissue it to send a new invitation to ${email}.`
          : `The invitation to sign in could not be sent to ${email}. The employee record is saved.`}
      </p>
      <div>
        <button type="button" disabled={resending} onClick={onResend} className={primaryButton}>
          {resending && <span aria-hidden="true" className={spinner} />}
          {expired ? 'Reissue invitation' : 'Resend invitation'}
        </button>
      </div>
    </Alert>
  )
}
