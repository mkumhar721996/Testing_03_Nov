import { describe, expect, it } from 'vitest';
import { validateEmployee } from './employee.validator';

const ok = {
  firstName: 'Maria',
  lastName: 'Okafor',
  workEmail: ' Maria.Okafor@Acme.com ',
  departmentId: 'd1',
  jobTitleId: 't1',
};

describe('validateEmployee', () => {
  it('accepts a minimal record, trimming and lower-casing the work email', () => {
    const res = validateEmployee(ok);
    expect(res.errors).toEqual({});
    expect(res.value?.workEmail).toBe('maria.okafor@acme.com');
    expect(res.value?.managerId).toBeNull();
  });

  it.each(['firstName', 'lastName', 'workEmail', 'departmentId', 'jobTitleId'])('requires %s (AC1)', (field) => {
    const res = validateEmployee({ ...ok, [field]: '  ' });
    expect(res.errors[field]).toBeDefined();
    expect(res.value).toBeUndefined();
  });

  it('rejects malformed emails', () => {
    expect(validateEmployee({ ...ok, workEmail: 'not-an-email' }).errors.workEmail).toBeDefined();
    expect(validateEmployee({ ...ok, personalEmail: 'nope' }).errors.personalEmail).toBeDefined();
  });

  it('rejects a non-object body', () => {
    expect(Object.keys(validateEmployee(undefined).errors).length).toBeGreaterThan(0);
  });

  it('ignores a status in the body (AC6)', () => {
    expect(validateEmployee({ ...ok, status: 'active' }).value).not.toHaveProperty('status');
  });
});
