export const GUEST_SESSION_COOKIE = 'guest_session';

export interface GuestSession {
  id: string;
  balance: number;
  createdAt: Date;
}

export interface GuestSessionView {
  balance: number;
  startingBalance: number;
  resumed: boolean;
  canClaimTopUp: boolean;
}

export interface GuestSessionRepository {
  create(startingBalance: number): Promise<GuestSession>;
  find(id: string): Promise<GuestSession | null>;
  // Atomic: sets balance to startingBalance only where balance < 1. Returns null if not eligible.
  claimTopUp(id: string, startingBalance: number): Promise<GuestSession | null>;
  // Removes sessions created more than maxAgeSeconds ago (their cookie has expired). Returns the count.
  deleteExpired(maxAgeSeconds: number): Promise<number>;
}

export const GUEST_SESSION_REPOSITORY = Symbol('GUEST_SESSION_REPOSITORY');
export const GUEST_SESSION_CONFIG = Symbol('GUEST_SESSION_CONFIG');
