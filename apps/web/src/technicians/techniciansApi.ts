export interface WorkingDay {
  /** 0 (Sunday) to 6 (Saturday). */
  weekday: number
  start: string
  end: string
}

export interface Technician {
  id: string
  name: string
  loginEmail: string
  phone: string | null
  serviceArea: string | null
  notes: string | null
  active: boolean
}

export interface TechnicianSummary extends Technician {
  workingDays: number[]
  openJobCount: number
  nextDayOff: string | null
}

export interface TechnicianProfile extends Technician {
  workingHours: WorkingDay[]
  daysOff: string[]
}

export interface Job {
  id: string
  title: string
  customer: string
  scheduledDate: string
  scheduledTime: string | null
  technicianId: string | null
  status: string
}

export interface NewTechnicianInput {
  name: string
  loginEmail: string
  phone?: string
  serviceArea?: string
}

export interface ProfileInput {
  name: string
  loginEmail: string
  phone: string
  serviceArea: string
  notes: string
}

export interface ReassignmentNeeded {
  technician: Technician
  jobsNeedingReassignment: Job[]
}

/** The caller is not an admin (HTTP 403). */
export class NotAdminError extends Error {}

/** The server refused the input (HTTP 400/409); `errors` is keyed by field name or weekday. */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Record<string, string>,
  ) {
    super(message)
  }
}

// Stand-in matching the API's AdminGuard until real sign-in lands.
const ADMIN_HEADERS = { 'x-user-role': 'admin' }

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}${path}`, {
    method: init.method ?? 'GET',
    headers: { ...ADMIN_HEADERS, ...(init.body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (res.status === 403) throw new NotAdminError('Only an admin can manage technicians')
  if (res.status === 400 || res.status === 409) {
    const body = (await res.json().catch(() => null)) as { message?: unknown; errors?: Record<string, string> } | null
    throw new ValidationError(typeof body?.message === 'string' ? body.message : 'The change was refused', body?.errors ?? {})
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const enc = encodeURIComponent

export const listTechnicians = (status?: 'active' | 'inactive') =>
  request<TechnicianSummary[]>(`/technicians${status ? `?status=${status}` : ''}`)
export const getTechnician = (id: string) => request<TechnicianProfile>(`/technicians/${enc(id)}`)
export const listAssignableTechnicians = () => request<Technician[]>('/technicians/assignable')
export const createTechnician = (input: NewTechnicianInput) =>
  request<Technician>('/technicians', { method: 'POST', body: input })
export const updateProfile = (id: string, input: ProfileInput) =>
  request<Technician>(`/technicians/${enc(id)}`, { method: 'PATCH', body: input })
export const saveWeeklyHours = (id: string, days: WorkingDay[]) =>
  request<void>(`/technicians/${enc(id)}/hours`, { method: 'PUT', body: { days } })
export const markDayOff = (id: string, date: string) =>
  request<ReassignmentNeeded>(`/technicians/${enc(id)}/days-off`, { method: 'POST', body: { date } })
export const removeDayOff = (id: string, date: string) =>
  request<void>(`/technicians/${enc(id)}/days-off/${enc(date)}`, { method: 'DELETE' })
export const deactivateTechnician = (id: string) =>
  request<ReassignmentNeeded>(`/technicians/${enc(id)}/deactivate`, { method: 'POST' })
export const activateTechnician = (id: string) =>
  request<Technician>(`/technicians/${enc(id)}/activate`, { method: 'POST' })
export const listJobsHeldBy = (id: string) => request<Job[]>(`/technicians/${enc(id)}/jobs`)
export const reassignJob = (jobId: string, technicianId: string) =>
  request<Job>(`/jobs/${enc(jobId)}/reassign`, { method: 'POST', body: { technicianId } })

export type TechniciansApi = {
  listTechnicians: typeof listTechnicians
  getTechnician: typeof getTechnician
  listAssignableTechnicians: typeof listAssignableTechnicians
  createTechnician: typeof createTechnician
  updateProfile: typeof updateProfile
  saveWeeklyHours: typeof saveWeeklyHours
  markDayOff: typeof markDayOff
  removeDayOff: typeof removeDayOff
  deactivateTechnician: typeof deactivateTechnician
  activateTechnician: typeof activateTechnician
  listJobsHeldBy: typeof listJobsHeldBy
  reassignJob: typeof reassignJob
}

export const techniciansApi: TechniciansApi = {
  listTechnicians,
  getTechnician,
  listAssignableTechnicians,
  createTechnician,
  updateProfile,
  saveWeeklyHours,
  markDayOff,
  removeDayOff,
  deactivateTechnician,
  activateTechnician,
  listJobsHeldBy,
  reassignJob,
}
