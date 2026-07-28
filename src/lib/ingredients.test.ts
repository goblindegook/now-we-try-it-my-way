import { describe, expect, it } from 'vitest'
import {
  buildIngredientSlugIndex,
  computeSymmetricPairings,
  findRecipesUsingIngredient,
  normalizeIngredientName,
  resolveIngredientSlug,
} from './ingredients'

describe('normalizeIngredientName', () => {
  it('trims whitespace', () => {
    expect(normalizeIngredientName('  Garlic  ')).toBe('garlic')
  })

  it('lowercases the name', () => {
    expect(normalizeIngredientName('GARLIC')).toBe('garlic')
  })
})

describe('computeSymmetricPairings', () => {
  it('adds the reverse link when only one direction is declared', () => {
    const result = computeSymmetricPairings([{ name: 'garlic', pairings: ['tomato'] }, { name: 'tomato' }])
    expect(result.get('tomato')).toEqual(['garlic'])
  })

  it('keeps the declared direction untouched', () => {
    const result = computeSymmetricPairings([{ name: 'garlic', pairings: ['tomato'] }, { name: 'tomato' }])
    expect(result.get('garlic')).toEqual(['tomato'])
  })

  it('does not double-count when both directions are already declared', () => {
    const result = computeSymmetricPairings([
      { name: 'garlic', pairings: ['tomato'] },
      { name: 'tomato', pairings: ['garlic'] },
    ])
    expect(result.get('garlic')).toEqual(['tomato'])
    expect(result.get('tomato')).toEqual(['garlic'])
  })

  it('keeps an unresolvable pairing name without adding a bogus reverse entry', () => {
    const result = computeSymmetricPairings([{ name: 'garlic', pairings: ['olive oil'] }])
    expect(result.get('garlic')).toEqual(['olive oil'])
    expect(result.has('olive oil')).toBe(false)
  })

  it('returns an empty pairings list for an entry with none declared and none reversed', () => {
    const result = computeSymmetricPairings([{ name: 'saffron' }])
    expect(result.get('saffron')).toEqual([])
  })
})

describe('resolveIngredientSlug', () => {
  const entries = [{ slug: 'garlic', name: 'Garlic' }]

  it('resolves a slug for a matching name', () => {
    expect(resolveIngredientSlug('garlic', entries)).toBe('garlic')
  })

  it('returns undefined when no entry matches', () => {
    expect(resolveIngredientSlug('olive oil', entries)).toBeUndefined()
  })
})

describe('buildIngredientSlugIndex', () => {
  it('resolves a slug for the canonical name', () => {
    const index = buildIngredientSlugIndex([{ slug: 'orange', name: 'orange' }])
    expect(index.get(normalizeIngredientName('Orange'))).toBe('orange')
  })

  it('resolves a slug for an alias', () => {
    const index = buildIngredientSlugIndex([{ slug: 'orange', name: 'orange', aliases: ['oranges'] }])
    expect(index.get(normalizeIngredientName('oranges'))).toBe('orange')
  })

  it('does not resolve a name with no matching entry or alias', () => {
    const index = buildIngredientSlugIndex([{ slug: 'orange', name: 'orange', aliases: ['oranges'] }])
    expect(index.get(normalizeIngredientName('lemons'))).toBeUndefined()
  })

  it('handles entries with no aliases declared', () => {
    const index = buildIngredientSlugIndex([{ slug: 'garlic', name: 'garlic' }])
    expect(index.get(normalizeIngredientName('Garlic'))).toBe('garlic')
  })
})

describe('findRecipesUsingIngredient', () => {
  const recipes = [
    { slug: 'carbonara', ingredients: [{ name: 'guanciale' }, { name: 'Garlic' }] },
    { slug: 'moussaka', ingredients: [{ name: 'lamb' }] },
  ]

  it('returns recipes containing a case-insensitive match', () => {
    expect(findRecipesUsingIngredient(['garlic'], recipes).map((r) => r.slug)).toEqual(['carbonara'])
  })

  it('returns an empty array when no recipe matches', () => {
    expect(findRecipesUsingIngredient(['saffron'], recipes)).toEqual([])
  })

  it('does not fuzzy-match a compound ingredient name as a substring', () => {
    const compound = [{ slug: 'aubergine-rolls', ingredients: [{ name: 'garlic clove' }] }]
    expect(findRecipesUsingIngredient(['garlic'], compound)).toEqual([])
  })

  it('matches a recipe that uses any of several given names', () => {
    const aliasRecipes = [{ slug: 'orange-soup', ingredients: [{ name: 'oranges' }] }]
    expect(findRecipesUsingIngredient(['orange', 'oranges'], aliasRecipes).map((r) => r.slug)).toEqual(['orange-soup'])
  })
})
