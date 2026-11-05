import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ConflictException, GoneException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { InvitationRecord } from './employee.record';
import type { EmployeeRepository } from './employee.repository';
import type { InvitationSender } from './invitation.sender';
import { deriveInvitationStatus, invitationExpiresAt, type InvitationStatus } from './invitation.status';
import type { Principal } from './principal';

export const EMPLOYEE_REPOSITORY = 'EMPLOYEE_REPOSITORY';
export const INVITATION_SENDER = 'INVITATION_SENDER';
export const CLOCK = 'CLOCK';
export const TOKEN_GENERATOR = 'TOKEN_GENERATOR';
export const APP_BASE_URL = 'APP_BASE_URL';

export interface InvitationView {
  status: InvitationStatus;
  sentAt: string | null;
  expiresAt: string | null;
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const generateToken = () => randomBytes(32).toString('base64url');

@Injectable()
export class InvitationService {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly repo: EmployeeRepository,
    @Inject(INVITATION_SENDER) private readonly sender: InvitationSender,
    @Inject(CLOCK) private readonly clock: () => Date,
    @Inject(TOKEN_GENERATOR) private readonly newToken: () => string = generateToken,
    @Inject(APP_BASE_URL) private readonly baseUrl: string = 'http://localhost:5173',
  ) {}

  /** A fresh invitation (unsent) plus the raw token that is only ever emailed, never stored. */
  issue(tenantId: string, employeeId: string): { record: InvitationRecord; token: string } {
    const token = this.newToken();
    return {
      token,
      record: {
        id: randomUUID(),
        tenantId,
        employeeId,
        tokenHash: hashToken(token),
        createdAt: this.clock(),
        sentAt: null,
        acceptedAt: null,
        revokedAt: null,
      },
    };
  }

  /**
   * Runs after the record is committed. A delivery failure is swallowed on purpose: the employee
   * record stays, `sent_at` stays NULL and the invitation reports not_delivered.
   */
  async deliver(invitation: InvitationRecord, to: string, token: string): Promise<InvitationRecord> {
    try {
      await this.sender.send(to, this.acceptUrl(token));
      const sentAt = this.clock();
      await this.repo.markSent(invitation.id, sentAt);
      return { ...invitation, sentAt };
    } catch {
      return invitation;
    }
  }

  private acceptUrl(token: string): string {
    const query = new URLSearchParams({ token });
    return `${this.baseUrl.replace(/\/$/, '')}/#/invitations/accept?${query}`;
  }

  view(inv: Pick<InvitationRecord, 'sentAt' | 'acceptedAt'>): InvitationView {
    return {
      status: deriveInvitationStatus(inv, this.clock()),
      sentAt: inv.sentAt?.toISOString() ?? null,
      expiresAt: inv.sentAt ? invitationExpiresAt(inv.sentAt).toISOString() : null,
    };
  }

  async getInvitation(principal: Principal, employeeId: string): Promise<InvitationView> {
    return this.view(await this.latest(principal, employeeId));
  }

  /** Serves both "resend" (not delivered) and "reissue" (expired). */
  async resend(principal: Principal, employeeId: string): Promise<InvitationView> {
    const employee = await this.repo.findById(principal.tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    const current = await this.latest(principal, employeeId);
    const status = this.view(current).status;
    if (status !== 'not_delivered' && status !== 'expired') {
      throw new ConflictException({
        code: 'INVITATION_NOT_RESENDABLE',
        message: 'This invitation is still valid or already accepted.',
      });
    }
    const { record, token } = this.issue(principal.tenantId, employeeId);
    await this.repo.replaceInvitation(principal.tenantId, employeeId, record);
    return this.view(await this.deliver(record, employee.workEmail, token));
  }

  async accept(token: string): Promise<{ employeeId: string }> {
    const inv = typeof token === 'string' && token ? await this.repo.findInvitationByTokenHash(hashToken(token)) : undefined;
    if (!inv || inv.revokedAt) throw new NotFoundException('Invitation not found');
    const status = this.view(inv).status;
    if (status === 'expired') {
      throw new GoneException({ code: 'INVITATION_EXPIRED', message: 'This invitation has expired.' });
    }
    if (status === 'accepted') throw new NotFoundException('Invitation not found');
    if (!(await this.repo.markAccepted(inv.id, this.clock()))) throw new NotFoundException('Invitation not found');
    return { employeeId: inv.employeeId };
  }

  private async latest(principal: Principal, employeeId: string): Promise<InvitationRecord> {
    const inv = await this.repo.latestInvitation(principal.tenantId, employeeId);
    if (!inv) throw new NotFoundException('Employee not found');
    return inv;
  }
}
