import { INVITATION_TTL_DAYS } from './employee.constants';

export type InvitationStatus = 'sent' | 'not_delivered' | 'expired' | 'accepted';

const DAY_MS = 24 * 60 * 60 * 1000;

export function invitationExpiresAt(sentAt: Date): Date {
  return new Date(sentAt.getTime() + INVITATION_TTL_DAYS * DAY_MS);
}

/** Exactly 14 days after it was sent counts as expired; a never-delivered invitation does not expire. */
export function deriveInvitationStatus(
  inv: { sentAt: Date | null; acceptedAt: Date | null },
  now: Date,
): InvitationStatus {
  if (inv.acceptedAt) return 'accepted';
  if (!inv.sentAt) return 'not_delivered';
  return now.getTime() >= invitationExpiresAt(inv.sentAt).getTime() ? 'expired' : 'sent';
}
