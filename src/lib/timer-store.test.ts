// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import type { TimerRecord } from './timer-store'
import { getRemaining, getTimers, isRunning, markExpired, removeTimer, upsertTimer } from './timer-store'

function makeTimer(overrides: Partial<TimerRecord> = {}): TimerRecord {
  return {
    id: 'test-1',
    label: 'Test timer',
    recipeName: 'Test Recipe',
    recipeUrl: '/recipes/test',
    duration: 60,
    startedAt: null,
    elapsed: 0,
    done: false,
    soundPlayed: false,
    ...overrides,
  }
}

describe('timer-store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getTimers', () => {
    it('returns empty array when nothing is stored', () => {
      expect(getTimers()).toEqual([])
    })
  })

  describe('upsertTimer', () => {
    it('adds a timer to storage', () => {
      upsertTimer(makeTimer())
      expect(getTimers()).toHaveLength(1)
      expect(getTimers()[0].id).toBe('test-1')
    })

    it('replaces an existing timer with the same id', () => {
      upsertTimer(makeTimer({ label: 'original' }))
      upsertTimer(makeTimer({ label: 'updated' }))
      const timers = getTimers()
      expect(timers).toHaveLength(1)
      expect(timers[0].label).toBe('updated')
    })

    it('keeps other timers when upserting', () => {
      upsertTimer(makeTimer({ id: 'a' }))
      upsertTimer(makeTimer({ id: 'b' }))
      expect(getTimers()).toHaveLength(2)
    })
  })

  describe('removeTimer', () => {
    it('removes the timer with the matching id', () => {
      upsertTimer(makeTimer({ id: 'a' }))
      upsertTimer(makeTimer({ id: 'b' }))
      removeTimer('a')
      const timers = getTimers()
      expect(timers).toHaveLength(1)
      expect(timers[0].id).toBe('b')
    })

    it('is a no-op when the id does not exist', () => {
      upsertTimer(makeTimer({ id: 'a' }))
      removeTimer('nonexistent')
      expect(getTimers()).toHaveLength(1)
    })
  })

  describe('getRemaining', () => {
    it('returns duration for an idle timer with no elapsed time', () => {
      const t = makeTimer({ duration: 60, elapsed: 0, startedAt: null })
      expect(getRemaining(t)).toBe(60)
    })

    it('subtracts elapsed time for a paused timer', () => {
      const t = makeTimer({ duration: 60, elapsed: 20, startedAt: null })
      expect(getRemaining(t)).toBe(40)
    })

    it('accounts for time since startedAt for a running timer', () => {
      const t = makeTimer({ duration: 60, elapsed: 0, startedAt: Date.now() - 10_000 })
      expect(getRemaining(t)).toBeGreaterThan(48)
      expect(getRemaining(t)).toBeLessThan(52)
    })

    it('returns 0 for a done timer regardless of elapsed', () => {
      const t = makeTimer({ done: true, duration: 60, elapsed: 60, startedAt: null })
      expect(getRemaining(t)).toBe(0)
    })

    it('never returns a negative value', () => {
      const t = makeTimer({ duration: 60, elapsed: 100, startedAt: null })
      expect(getRemaining(t)).toBe(0)
    })
  })

  describe('isRunning', () => {
    it('returns true when startedAt is set and timer is not done', () => {
      const t = makeTimer({ startedAt: Date.now(), done: false })
      expect(isRunning(t)).toBe(true)
    })

    it('returns false when done is true even if startedAt is set', () => {
      const t = makeTimer({ startedAt: Date.now(), done: true })
      expect(isRunning(t)).toBe(false)
    })

    it('returns false when startedAt is null', () => {
      const t = makeTimer({ startedAt: null, done: false })
      expect(isRunning(t)).toBe(false)
    })
  })

  describe('markExpired', () => {
    it('marks a timer done when getRemaining is 0', () => {
      upsertTimer(makeTimer({ id: 'expired', duration: 60, elapsed: 60, startedAt: null }))
      markExpired()
      expect(getTimers()[0].done).toBe(true)
    })

    it('sets startedAt to null when marking done', () => {
      upsertTimer(makeTimer({ id: 'expired', duration: 10, elapsed: 0, startedAt: Date.now() - 15_000 }))
      markExpired()
      expect(getTimers()[0].startedAt).toBeNull()
    })

    it('does not mark a timer done when time remains', () => {
      upsertTimer(makeTimer({ id: 'active', duration: 60, elapsed: 0, startedAt: null }))
      markExpired()
      expect(getTimers()[0].done).toBe(false)
    })

    it('is a no-op when there are no timers', () => {
      expect(() => markExpired()).not.toThrow()
    })

    it('marks a running timer done and sets soundPlayed false when elapsed time exceeds duration', () => {
      // Simulates a timer that was started but whose step-timer component is no longer mounted
      // (e.g. user navigated away from the recipe page). The dock must be able to detect this.
      upsertTimer(makeTimer({ id: 'running-expired', duration: 30, elapsed: 0, startedAt: Date.now() - 60_000 }))
      markExpired()
      const timer = getTimers()[0]
      expect(timer.done).toBe(true)
      expect(timer.soundPlayed).toBe(false)
      expect(timer.startedAt).toBeNull()
    })
  })
})
