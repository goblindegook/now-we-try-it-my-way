export const STORAGE_KEY = 'cookbook-wake-lock'
export const TTL = 86_400_000

export function readState(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { enabled: boolean; expiresAt: number }
    if (!parsed.enabled || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function writeState(on: boolean): void {
  try {
    if (on) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, expiresAt: Date.now() + TTL }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {}
}
