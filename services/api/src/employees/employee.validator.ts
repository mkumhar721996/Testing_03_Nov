export interface NewEmployeeInput {
  firstName: string;
  lastName: string;
  personalEmail: string | null;
  phone: string | null;
  workEmail: string;
  departmentId: string;
  jobTitleId: string;
  managerId: string | null;
}

export interface EmployeeCheck {
  value?: NewEmployeeInput;
  errors: Record<string, string>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Any `status` in the body is ignored: a new record always starts as Pending start. */
export function validateEmployee(body: unknown): EmployeeCheck {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const required = (key: string, label: string) => {
    const v = text(b[key]);
    if (!v) errors[key] = `${label} is required.`;
    return v;
  };
  const firstName = required('firstName', 'First name');
  const lastName = required('lastName', 'Last name');
  const workEmail = required('workEmail', 'Work email').toLowerCase();
  const departmentId = required('departmentId', 'Department');
  const jobTitleId = required('jobTitleId', 'Job title');
  if (workEmail && !EMAIL.test(workEmail)) errors.workEmail = 'Enter a valid work email.';
  const personalEmail = text(b.personalEmail);
  if (personalEmail && !EMAIL.test(personalEmail)) errors.personalEmail = 'Enter a valid personal email.';

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      firstName,
      lastName,
      personalEmail: personalEmail || null,
      phone: text(b.phone) || null,
      workEmail,
      departmentId,
      jobTitleId,
      managerId: text(b.managerId) || null,
    },
  };
}
