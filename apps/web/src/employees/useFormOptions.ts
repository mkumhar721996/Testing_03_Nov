import { fetchFormOptions } from './employeesApi'
import { useLoad } from './useLoad'

export function useFormOptions() {
  return useLoad((signal) => fetchFormOptions(signal))
}
