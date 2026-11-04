import { ConflictException, GoneException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { FakeSender, hr, setup, tokenFromUrl, valid } from './employees.fakes';

describe('InvitationService', () => {
  it('resends after a failed delivery and revokes the first invitation (AC9)', async () => {
    const sender = new FakeSender();
    sender.fail = true;
    const { service, invitations, repo } = setup(sender);
    const { employee } = await service.create(hr, valid());
    sender.fail = false;
    const view = await invitations.resend(hr, employee.id);
    expect(view.status).toBe('sent');
    expect(sender.sent.at(-1)?.to).toBe(employee.workEmail);
    expect(repo.invitations[0].revokedAt).not.toBeNull();
  });

  it('does not resend a sent or accepted invitation (AC9)', async () => {
    const sender = new FakeSender();
    const { service, invitations } = setup(sender);
    const { employee } = await service.create(hr, valid());
    await expect(invitations.resend(hr, employee.id)).rejects.toBeInstanceOf(ConflictException);
    await invitations.accept(tokenFromUrl(sender.sent[0].acceptUrl));
    await expect(invitations.resend(hr, employee.id)).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps the warning state when the resend itself fails (AC9)', async () => {
    const sender = new FakeSender();
    sender.fail = true;
    const { service, invitations } = setup(sender);
    const { employee } = await service.create(hr, valid());
    expect((await invitations.resend(hr, employee.id)).status).toBe('not_delivered');
  });

  it('cannot accept an invitation after 14 days (AC10)', async () => {
    const sender = new FakeSender();
    const { service, invitations, repo, clock } = setup(sender);
    await service.create(hr, valid());
    const token = tokenFromUrl(sender.sent[0].acceptUrl);
    clock.set(new Date('2026-11-04T09:00:00Z'));
    await expect(invitations.accept(token)).rejects.toBeInstanceOf(GoneException);
    expect(repo.invitations[0].acceptedAt).toBeNull();
  });

  it('accepts a valid token and rejects unknown ones (AC10)', async () => {
    const sender = new FakeSender();
    const { service, invitations, repo } = setup(sender);
    const { employee } = await service.create(hr, valid());
    await expect(invitations.accept(tokenFromUrl(sender.sent[0].acceptUrl))).resolves.toEqual({
      employeeId: employee.id,
    });
    expect(repo.invitations[0].acceptedAt).not.toBeNull();
    await expect(invitations.accept('unknown')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reissues after expiry; the old token stops working (AC11)', async () => {
    const sender = new FakeSender();
    const { service, invitations, clock } = setup(sender);
    const { employee } = await service.create(hr, valid());
    const oldToken = tokenFromUrl(sender.sent[0].acceptUrl);
    clock.set(new Date('2026-11-04T09:00:00Z'));
    expect((await invitations.getInvitation(hr, employee.id)).status).toBe('expired');
    const view = await invitations.resend(hr, employee.id);
    expect(view.status).toBe('sent');
    expect(sender.sent).toHaveLength(2);
    expect(sender.sent[1].to).toBe(employee.workEmail);
    await expect(invitations.accept(oldToken)).rejects.toBeInstanceOf(NotFoundException);
    await expect(invitations.accept(tokenFromUrl(sender.sent[1].acceptUrl))).resolves.toEqual({
      employeeId: employee.id,
    });
  });

  it('hides another tenant’s employee', async () => {
    const { service, invitations } = setup();
    const { employee } = await service.create(hr, valid());
    const other = { ...hr, tenantId: 'tenant-b' };
    await expect(invitations.getInvitation(other, employee.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(invitations.resend(other, employee.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
