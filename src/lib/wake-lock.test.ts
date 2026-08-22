import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readState, STORAGE_KEY, TTL, writeState } from './wake-lock'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('readState', () => {
  it('returns false when nothing is stored', () => {
    expect(readState()).toBe(false)
  })

  it('returns true when a valid unexpired entry exists', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, expiresAt: Date.now() + TTL }))
    expect(readState()).toBe(true)
  })

  it('returns false and removes entry when TTL has expired', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, expiresAt: Date.now() - 1 }))
    expect(readState()).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('returns false when enabled is false in stored value', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: false, expiresAt: Date.now() + TTL }))
    expect(readState()).toBe(false)
  })
})

describe('writeState', () => {
  it('writes enabled:true with a future expiresAt', () => {
    const before = Date.now()
    writeState(true)
    // biome-ignore lint/style/noNonNullAssertion: test fails if null
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(parsed.enabled).toBe(true)
    expect(parsed.expiresAt).toBeGreaterThan(before)
  })

  it('removes the entry when called with false', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, expiresAt: Date.now() + TTL }))
    writeState(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
