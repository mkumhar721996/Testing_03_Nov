import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DEPT, FakeSender, MGR, TITLE, hr, setup, tokenFromUrl, valid } from './employees.fakes';
import { UnconfiguredInvitationSender } from './unconfigured-invitation.sender';

describe('EmployeeService.create', () => {
  it('stores the details (AC1)', async () => {
    const { service, repo } = setup();
    const { employee } = await service.create(
      hr,
      valid({ firstName: 'Maria', lastName: 'Okafor', workEmail: 'maria.okafor@acme.com' }),
    );
    expect(repo.employees).toHaveLength(1);
    expect(repo.employees[0]).toMatchObject({
      tenantId: hr.tenantId,
      firstName: 'Maria',
      lastName: 'Okafor',
      workEmail: 'maria.okafor@acme.com',
      departmentId: DEPT.id,
      jobTitleId: TITLE.id,
    });
    expect(employee.id).toBe(repo.employees[0].id);
  });

  it('rejects a bad body with 400 field errors', async () => {
    const { service, repo } = setup();
    await expect(service.create(hr, valid({ firstName: '' }))).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.employees).toHaveLength(0);
  });

  it.each(['departmentId', 'jobTitleId', 'managerId'])('rejects a %s outside the Organization lists (AC2)', async (f) => {
    const { service, repo } = setup();
    await expect(service.create(hr, valid({ [f]: 'not-in-org-list' }))).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.employees).toHaveLength(0);
  });

  it('offers only the Organization lists (AC2)', async () => {
    const { service } = setup();
    expect(await service.formOptions(hr)).toEqual({ departments: [DEPT], jobTitles: [TITLE], managers: [MGR] });
  });

  it('sends an invitation to the work email, storing only the token hash (AC3)', async () => {
    const sender = new FakeSender();
    const { service, repo } = setup(sender);
    const res = await service.create(hr, valid({ workEmail: 'maria.okafor@acme.com' }));
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0].to).toBe('maria.okafor@acme.com');
    expect(sender.sent[0].acceptUrl).toMatch(/token=[A-Za-z0-9_-]{43}/);
    expect(res.invitation.status).toBe('sent');
    expect(repo.invitations[0].tokenHash).not.toContain(tokenFromUrl(sender.sent[0].acceptUrl));
  });

  it('rejects a duplicate work email, case-insensitively, without an invitation (AC4, AC5)', async () => {
    const sender = new FakeSender();
    const { service, repo } = setup(sender);
    await service.create(hr, valid({ workEmail: 'x@acme.com' }));
    const dup = valid({ workEmail: 'X@Acme.com ' });
    await expect(service.create(hr, dup)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.create(hr, dup)).rejects.toMatchObject({
      response: { code: 'WORK_EMAIL_IN_USE', message: 'This work email is already in use.' },
    });
    expect(repo.employees).toHaveLength(1);
    expect(sender.sent).toHaveLength(1);
  });

  it('starts as Pending start whatever the body says (AC6)', async () => {
    const { service, repo } = setup();
    const { employee } = await service.create(hr, valid({ status: 'active' }));
    expect(employee.status).toBe('pending_start');
    expect(repo.employees[0].status).toBe('pending_start');
  });

  it('still creates the record when delivery fails (AC7)', async () => {
    const sender = new FakeSender();
    sender.fail = true;
    const { service, repo } = setup(sender);
    const res = await service.create(hr, valid());
    expect(repo.employees).toHaveLength(1);
    expect(res.invitation.status).toBe('not_delivered');
    expect(repo.invitations[0].sentAt).toBeNull();
  });

  it('reports not_delivered with the default unconfigured sender (AC7)', async () => {
    const { service, repo } = setup(new UnconfiguredInvitationSender());
    const res = await service.create(hr, valid());
    expect(repo.employees).toHaveLength(1);
    expect(res.invitation.status).toBe('not_delivered');
  });
});
