export function displayValue(value: string | null | undefined): string {
  return value?.trim() ? value : '-'
}

export function formatCreated(iso: string): string {
  return new Date(iso).toLocaleDateString()
}
