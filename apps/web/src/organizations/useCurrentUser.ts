import type { Identity } from './organizationApi'

// Stand-in until the authentication story lands: the signed-in user comes from build-time env vars.
export function useCurrentUser(): Identity | null {
  const role = import.meta.env.VITE_DEV_ROLE as string | undefined
  if (!role) return null
  return { role, organizationId: import.meta.env.VITE_DEV_ORGANIZATION_ID as string | undefined }
}
