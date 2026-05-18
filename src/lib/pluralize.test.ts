import { describe, expect, it } from 'vitest'
import { pluralize } from './pluralize'

describe('pluralize', () => {
  it('uses singular for count 1', () => {
    expect(pluralize(1, 'recipe')).toBe('1 recipe')
  })

  it('uses default plural for counts other than 1', () => {
    expect(pluralize(0, 'recipe')).toBe('0 recipes')
    expect(pluralize(2, 'recipe')).toBe('2 recipes')
  })

  it('supports custom plural forms', () => {
    expect(pluralize(2, 'person', 'people')).toBe('2 people')
  })
})
