import { describe, expect, it } from 'vitest'
import { cuisineToFlag } from './cuisine'

describe('cuisineToFlag', () => {
  it('returns italian flag for italian', () => {
    expect(cuisineToFlag('italian')).toBe('🇮🇹')
  })

  it('returns greek flag for greek', () => {
    expect(cuisineToFlag('greek')).toBe('🇬🇷')
  })

  it('returns indian flag for indian', () => {
    expect(cuisineToFlag('indian')).toBe('🇮🇳')
  })

  it('returns portuguese flag for portuguese', () => {
    expect(cuisineToFlag('portuguese')).toBe('🇵🇹')
  })

  it('returns french flag for french', () => {
    expect(cuisineToFlag('french')).toBe('🇫🇷')
  })

  it('returns empty string for unknown cuisine', () => {
    expect(cuisineToFlag('martian')).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(cuisineToFlag('')).toBe('')
  })
})
