import { ConflictException, GoneException } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { EmployeesController } from './employees.controller';
import { FakeSender, hr, setup, valid } from './employees.fakes';
import { HrGuard } from './hr.guard';
import { InvitationsController } from './invitations.controller';
import { UnconfiguredInvitationSender } from './unconfigured-invitation.sender';

const req = { principal: hr };

describe('EmployeesController', () => {
  it('is HR-only', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, EmployeesController)).toContain(HrGuard);
    expect(Reflect.getMetadata(GUARDS_METADATA, InvitationsController)).toBeUndefined();
  });

  it('returns the created record with an invitation even when delivery fails (AC7)', async () => {
    const { service, invitations } = setup(new UnconfiguredInvitationSender());
    const res = await new EmployeesController(service, invitations).create(req, valid());
    expect(res.invitation.status).toBe('not_delivered');
    expect(res.employee.status).toBe('pending_start');
  });

  it('surfaces a duplicate as 409 (AC4)', async () => {
    const { service, invitations } = setup(new FakeSender());
    const c = new EmployeesController(service, invitations);
    await c.create(req, valid());
    const err = await c.create(req, valid()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).getStatus()).toBe(409);
  });

  it('resends with 200 and hides other tenants’ employees', async () => {
    const { service, invitations } = setup(new UnconfiguredInvitationSender());
    const c = new EmployeesController(service, invitations);
    const { employee } = await c.create(req, valid());
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, EmployeesController.prototype.resend)).toBe(200);
    const err = await c.invitation({ principal: { ...hr, tenantId: 'tenant-b' } }, employee.id).catch((e: unknown) => e);
    expect((err as { getStatus(): number }).getStatus()).toBe(404);
  });

  it('answers an expired token with 410 (AC10)', async () => {
    const sender = new FakeSender();
    const { service, invitations, clock } = setup(sender);
    await new EmployeesController(service, invitations).create(req, valid());
    const token = new URL(sender.sent[0].acceptUrl.replace('/#', '')).searchParams.get('token') as string;
    clock.set(new Date('2026-11-04T09:00:00Z'));
    const err = await new InvitationsController(invitations).accept({ token }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GoneException);
    expect((err as GoneException).getStatus()).toBe(410);
  });
});
