export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  return `${base}${path}`
}

let onUnauthorized: (() => void) | null = null

/** The app registers what happens when the API says the session is gone. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

/** `fetch` against the API with the session cookie; any 401 reports the session as ended. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(apiUrl(path), { ...init, credentials: 'include' })
  if (res.status === 401) onUnauthorized?.()
  return res
}
