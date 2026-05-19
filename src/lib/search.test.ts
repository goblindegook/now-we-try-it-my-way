import type { Ingredient } from '@tmlmt/cooklang-parser'
import { describe, expect, it } from 'vitest'
import type { ParsedRecipe } from './cooklang'
import { buildSearchIndex } from './search'

function makeRecipe(overrides: Partial<ParsedRecipe> = {}): ParsedRecipe {
  return {
    slug: 'test-recipe',
    title: 'Test Recipe',
    description: '',
    category: 'Mains',
    cuisine: '',
    tags: [],
    servings: 4,
    photo: '',
    prepTime: '10 minutes',
    cookTime: '20 minutes',
    date: '',
    ingredients: [],
    timers: [],
    sections: [],
    steps: [],
    cookware: [],
    ...overrides,
  }
}

function makeIngredient(name: string): Ingredient {
  return { name } as unknown as Ingredient
}

describe('search index', () => {
  it('returns slug for matching title query', async () => {
    const bs = await buildSearchIndex([
      makeRecipe({ slug: 'carbonara', title: 'Spaghetti Carbonara' }),
      makeRecipe({ slug: 'moussaka', title: 'Moussaka' }),
    ])
    expect(bs.search('carbonara').map((r) => r.slug)).toContain('carbonara')
  })

  it('does not return unrelated results', async () => {
    const bs = await buildSearchIndex([
      makeRecipe({ slug: 'carbonara', title: 'Spaghetti Carbonara' }),
      makeRecipe({ slug: 'moussaka', title: 'Moussaka' }),
    ])
    expect(bs.search('carbonara').map((r) => r.slug)).not.toContain('moussaka')
  })

  it('returns slug for matching ingredient query', async () => {
    const bs = await buildSearchIndex([
      makeRecipe({ slug: 'carbonara', ingredients: [makeIngredient('guanciale')] }),
      makeRecipe({ slug: 'moussaka', ingredients: [makeIngredient('lamb')] }),
    ])
    expect(bs.search('guanciale').map((r) => r.slug)).toContain('carbonara')
  })

  it('returns slug for matching tag query', async () => {
    const bs = await buildSearchIndex([
      makeRecipe({ slug: 'carbonara', tags: ['Italian', 'pasta'] }),
      makeRecipe({ slug: 'naan', tags: ['bread', 'Indian'] }),
    ])
    expect(bs.search('pasta').map((r) => r.slug)).toContain('carbonara')
  })

  it('applies stemmer so "pasta" matches ingredient indexed as "pastas"', async () => {
    const bs = await buildSearchIndex([makeRecipe({ slug: 'pasta-dish', ingredients: [makeIngredient('pastas')] })])
    expect(bs.search('pasta').map((r) => r.slug)).toContain('pasta-dish')
  })

  it('returns slug for matching cuisine query', async () => {
    const bs = await buildSearchIndex([
      makeRecipe({ slug: 'carbonara', cuisine: 'italian' }),
      makeRecipe({ slug: 'moussaka', cuisine: 'greek' }),
    ])
    expect(bs.search('italian').map((r) => r.slug)).toContain('carbonara')
  })

  it('returns slug for matching category query', async () => {
    const bs = await buildSearchIndex([
      makeRecipe({ slug: 'carbonara', category: 'Mains' }),
      makeRecipe({ slug: 'bruschetta', category: 'Starters' }),
    ])
    expect(bs.search('starters').map((r) => r.slug)).toContain('bruschetta')
  })

  it('builds index with photoSrc resolved per recipe', async () => {
    const bs = await buildSearchIndex(
      [
        makeRecipe({ slug: 'carbonara', title: 'Spaghetti Carbonara' }),
        makeRecipe({ slug: 'moussaka', title: 'Moussaka' }),
      ],
      async (recipe) => `/_astro/${recipe.slug}.webp`,
    )

    const result = bs.search('carbonara').find((r) => r.slug === 'carbonara')
    expect(result?.photoSrc).toBe('/_astro/carbonara.webp')
  })

  it('stores null photoSrc when resolver is omitted', async () => {
    const bs = await buildSearchIndex([makeRecipe({ slug: 'carbonara', title: 'Spaghetti Carbonara' })])
    const result = bs.search('carbonara').find((r) => r.slug === 'carbonara')
    expect(result?.photoSrc).toBeNull()
  })
})
