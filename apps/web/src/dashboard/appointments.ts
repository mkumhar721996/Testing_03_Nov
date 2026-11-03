export interface Appointment {
  id: string
  startsAt: string
  endsAt: string
  bookedAt: string
}

export async function fetchAppointments(signal?: AbortSignal): Promise<Appointment[]> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}/appointments/me`, { signal })
  if (!res.ok) throw new Error(`Appointments failed: ${res.status}`)
  const body: unknown = await res.json()
  if (!Array.isArray(body)) throw new Error('Appointments response was not a list')
  return body as Appointment[]
}

const time = (iso: string) => new Date(iso).getTime()

// An appointment stays upcoming until its end time is reached.
export function upcomingAppointments(all: Appointment[], now: Date): Appointment[] {
  return all
    .filter((a) => time(a.endsAt) > now.getTime())
    .sort(
      (a, b) =>
        time(a.startsAt) - time(b.startsAt) || time(a.bookedAt) - time(b.bookedAt) || a.id.localeCompare(b.id),
    )
}

export const appointmentHref = (id: string) => `#/appointments/${encodeURIComponent(id)}`
