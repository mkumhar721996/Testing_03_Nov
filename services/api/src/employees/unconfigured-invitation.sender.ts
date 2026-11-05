import type { InvitationSender } from './invitation.sender';

/** ADR-0008 leaves the email provider open; a fake "delivered" would hide failures, so this always rejects. */
export class UnconfiguredInvitationSender implements InvitationSender {
  async send(): Promise<void> {
    throw new Error('No email provider is configured');
  }
}
