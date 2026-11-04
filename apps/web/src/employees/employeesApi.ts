export interface OrgOption {
  id: string
  name: string
}

export interface FormOptions {
  departments: OrgOption[]
  jobTitles: OrgOption[]
  managers: OrgOption[]
}

export type InvitationStatus = 'sent' | 'not_delivered' | 'expired' | 'accepted'

export interface InvitationView {
  status: InvitationStatus
  sentAt: string | null
  expiresAt: string | null
}

export interface NewEmployee {
  firstName: string
  lastName: string
  personalEmail: string
  phone: string
  workEmail: string
  departmentId: string
  jobTitleId: string
  managerId: string
}

export interface EmployeeSummary {
  id: string
  name: string
  workEmail: string
  department: string | null
  jobTitle: string | null
  manager: string | null
  status: string
}

export class WorkEmailInUseError extends Error {
  constructor() {
    super('This work email is already in use.')
  }
}

const base = () => (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, init)
  if (!res.ok) {
    if (res.status === 409) {
      const body = (await res.json().catch(() => null)) as { code?: string } | null
      if (body?.code === 'WORK_EMAIL_IN_USE') throw new WorkEmailInUseError()
    }
    throw new Error(`Request to ${path} failed: ${res.status}`)
  }
  return (await res.json()) as T
}

export const fetchFormOptions = (signal?: AbortSignal) => request<FormOptions>('/employees/form-options', { signal })

export const createEmployee = (input: NewEmployee) =>
  request<{ employee: { id: string }; invitation: InvitationView }>('/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

export const fetchEmployee = (id: string, signal?: AbortSignal) =>
  request<EmployeeSummary>(`/employees/${encodeURIComponent(id)}`, { signal })

export const fetchInvitation = (id: string, signal?: AbortSignal) =>
  request<InvitationView>(`/employees/${encodeURIComponent(id)}/invitation`, { signal })

export const resendInvitation = (id: string) =>
  request<InvitationView>(`/employees/${encodeURIComponent(id)}/invitation`, { method: 'POST' })
