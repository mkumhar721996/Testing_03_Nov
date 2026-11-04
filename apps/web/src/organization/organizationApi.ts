export interface Organization {
  id: string
  name: string
  address: string
  admin: { name: string; email: string }
  createdBy: string
  financeContact: { role: string; name: string; email: string | null; phone: string | null }
}

export async function fetchOrganization(id: string, signal?: AbortSignal): Promise<Organization> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}/organizations/${encodeURIComponent(id)}`, { signal })
  if (!res.ok) throw new Error(`Organization failed: ${res.status}`)
  return (await res.json()) as Organization
}
