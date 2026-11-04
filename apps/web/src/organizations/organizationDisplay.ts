export function displayValue(value: string | null | undefined): string {
  return value?.trim() ? value : '-'
}
