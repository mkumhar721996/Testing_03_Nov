export interface Organization {
  id: string
  name: string
  type: string | null
  reference: string | null
  phone: string | null
  street: string | null
  street2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  adminName: string | null
  adminEmail: string | null
  adminPhone: string | null
  createdByName: string | null
  createdByRole: string | null
  createdAt: string
}

export async function fetchOrganizations(signal?: AbortSignal): Promise<Organization[]> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}/organizations`, { signal })
  if (!res.ok) throw new Error(`Organizations failed: ${res.status}`)
  return (await res.json()) as Organization[]
}
