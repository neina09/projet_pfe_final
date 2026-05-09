const API_ORIGIN = import.meta.env.VITE_API_BASE_URL || ''

export function endpoint(path) {
  return `${API_ORIGIN}${path}`
}
