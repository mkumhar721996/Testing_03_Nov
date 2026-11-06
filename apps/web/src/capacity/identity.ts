// TEMPORARY stand-in until SSO sign-in lands (ADR-0012); replace this module only.
// The only place that reads the stand-in identity from localStorage.

export function identityHeaders(): Record<string, string> {
  return {
    'x-user-id': localStorage.getItem('userId') ?? '',
    'x-user-role': localStorage.getItem('userRole') ?? '',
  }
}
