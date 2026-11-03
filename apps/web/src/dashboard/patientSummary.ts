export interface PatientSummary {
  name?: string | null
  consultancy?: string | null
  condition?: string | null
}

export async function fetchPatientSummary(signal?: AbortSignal): Promise<PatientSummary> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}/patients/me`, { signal })
  if (!res.ok) throw new Error(`Patient summary failed: ${res.status}`)
  return (await res.json()) as PatientSummary
}
