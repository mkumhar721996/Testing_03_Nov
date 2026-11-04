export const EMAIL_SENDER = 'EMAIL_SENDER';

/** Outbound email port; the provider is still open (ADR-0008). */
export interface EmailSender {
  sendPasswordReset(to: { email: string; name: string }, link: string): Promise<void>;
}
