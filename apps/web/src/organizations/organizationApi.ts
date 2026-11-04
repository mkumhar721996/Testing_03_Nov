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
  createdAt: string | null
}

export interface Identity {
  role: string
  organizationId?: string
}

export async function fetchOrganizations(identity: Identity, signal?: AbortSignal): Promise<Organization[]> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const headers: Record<string, string> = { 'x-user-role': identity.role }
  if (identity.organizationId) headers['x-organization-id'] = identity.organizationId
  const res = await fetch(`${base}/organizations`, { headers, signal })
  if (!res.ok) throw new Error(`Organizations failed: ${res.status}`)
  return (await res.json()) as Organization[]
}
