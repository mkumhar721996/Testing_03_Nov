import { describe, expect, it } from 'vitest';
import { deriveInvitationStatus } from './invitation.status';

const sentAt = new Date('2026-10-21T09:00:00Z');

describe('deriveInvitationStatus', () => {
  it('is sent before 14 days and expired from exactly 14 days (AC10)', () => {
    expect(deriveInvitationStatus({ sentAt, acceptedAt: null }, new Date('2026-11-04T08:59:59Z'))).toBe('sent');
    expect(deriveInvitationStatus({ sentAt, acceptedAt: null }, new Date('2026-11-04T09:00:00Z'))).toBe('expired');
  });

  it('is not_delivered when never sent, and never expires', () => {
    expect(deriveInvitationStatus({ sentAt: null, acceptedAt: null }, new Date('2030-01-01T00:00:00Z'))).toBe(
      'not_delivered',
    );
  });

  it('is accepted once accepted', () => {
    const acceptedAt = new Date('2026-10-22T09:00:00Z');
    expect(deriveInvitationStatus({ sentAt, acceptedAt }, new Date('2030-01-01T00:00:00Z'))).toBe('accepted');
  });
});
