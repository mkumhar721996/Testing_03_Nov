export interface InvitationSender {
  /** Resolves when the provider accepted the message; rejects when it could not be delivered. */
  send(to: string, acceptUrl: string): Promise<void>;
}
