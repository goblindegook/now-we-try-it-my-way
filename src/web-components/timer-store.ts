export type TimerRecord = {
  id: string
  label: string
  recipeName: string
  recipeUrl: string
  duration: number
  startedAt: number | null // epoch ms when last started/resumed
  elapsed: number // seconds elapsed before current run
  done: boolean
  soundPlayed: boolean
}

const KEY = 'cookbook-timers'
const EV = 'cookbook-timers-updated'

export function getTimers(): TimerRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function persist(timers: TimerRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(timers))
  window.dispatchEvent(new CustomEvent(EV))
}

export function upsertTimer(t: TimerRecord) {
  persist([...getTimers().filter((x) => x.id !== t.id), t])
}

export function removeTimer(id: string) {
  persist(getTimers().filter((x) => x.id !== id))
}

export function getRemaining(t: TimerRecord): number {
  if (t.done) return 0
  const totalElapsed = t.elapsed + (t.startedAt != null ? (Date.now() - t.startedAt) / 1000 : 0)
  return Math.max(0, t.duration - totalElapsed)
}

export function isRunning(t: TimerRecord): boolean {
  return !t.done && t.startedAt != null
}

export function markExpired() {
  const timers = getTimers()
  const updated = timers.map((t) =>
    !t.done && getRemaining(t) <= 0 ? { ...t, done: true, startedAt: null, soundPlayed: false } : t,
  )
  if (updated.some((t, i) => t.done !== timers[i].done)) persist(updated)
}
