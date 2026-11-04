import { apiFetch } from '../auth/apiFetch'

export interface PatientSummary {
  name?: string | null
  consultancy?: string | null
  condition?: string | null
}

export async function fetchPatientSummary(signal?: AbortSignal): Promise<PatientSummary> {
  const res = await apiFetch('/patients/me', { signal })
  if (!res.ok) throw new Error(`Patient summary failed: ${res.status}`)
  return (await res.json()) as PatientSummary
}
