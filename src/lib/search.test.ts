import { BloomSearch } from '@pacote/bloom-search'
import type { Ingredient } from '@tmlmt/cooklang-parser'
import { describe, expect, it } from 'vitest'
import type { ParsedRecipe } from './cooklang'
import { buildConfig, isSearchableTerm, toSearchDocument } from './search'

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

function buildIndex(recipes: ParsedRecipe[]) {
  const bs = new BloomSearch(buildConfig)
  recipes.forEach((recipe) => {
    bs.add(recipe.slug, toSearchDocument(recipe, null))
  })
  return bs
}

describe('toSearchDocument', () => {
  it('joins tags into a space-separated string', () => {
    const doc = toSearchDocument(makeRecipe({ tags: ['Italian', 'quick', 'pasta'] }), null)
    expect(doc.tags).toBe('Italian quick pasta')
  })

  it('joins ingredient names into a space-separated string', () => {
    const doc = toSearchDocument(
      makeRecipe({ ingredients: [makeIngredient('spaghetti'), makeIngredient('guanciale')] }),
      null,
    )
    expect(doc.ingredients).toBe('spaghetti guanciale')
  })

  it('stores photoSrc from second argument', () => {
    expect(toSearchDocument(makeRecipe(), '/_astro/photo.abc.webp').photoSrc).toBe('/_astro/photo.abc.webp')
  })

  it('stores null photoSrc when second argument is null', () => {
    expect(toSearchDocument(makeRecipe(), null).photoSrc).toBeNull()
  })

  it('includes cuisine from recipe', () => {
    const doc = toSearchDocument(makeRecipe({ cuisine: 'italian' }), null)
    expect(doc.cuisine).toBe('italian')
  })
})

describe('search index', () => {
  it('returns slug for matching title query', () => {
    const bs = buildIndex([
      makeRecipe({ slug: 'carbonara', title: 'Spaghetti Carbonara' }),
      makeRecipe({ slug: 'moussaka', title: 'Moussaka' }),
    ])
    expect(bs.search('carbonara').map((r) => r.slug)).toContain('carbonara')
  })

  it('does not return unrelated results', () => {
    const bs = buildIndex([
      makeRecipe({ slug: 'carbonara', title: 'Spaghetti Carbonara' }),
      makeRecipe({ slug: 'moussaka', title: 'Moussaka' }),
    ])
    expect(bs.search('carbonara').map((r) => r.slug)).not.toContain('moussaka')
  })

  it('returns slug for matching ingredient query', () => {
    const bs = buildIndex([
      makeRecipe({ slug: 'carbonara', ingredients: [makeIngredient('guanciale')] }),
      makeRecipe({ slug: 'moussaka', ingredients: [makeIngredient('lamb')] }),
    ])
    expect(bs.search('guanciale').map((r) => r.slug)).toContain('carbonara')
  })

  it('returns slug for matching tag query', () => {
    const bs = buildIndex([
      makeRecipe({ slug: 'carbonara', tags: ['Italian', 'pasta'] }),
      makeRecipe({ slug: 'naan', tags: ['bread', 'Indian'] }),
    ])
    expect(bs.search('pasta').map((r) => r.slug)).toContain('carbonara')
  })

  it('applies stemmer so "pasta" matches ingredient indexed as "pastas"', () => {
    const bs = buildIndex([makeRecipe({ slug: 'pasta-dish', ingredients: [makeIngredient('pastas')] })])
    expect(bs.search('pasta').map((r) => r.slug)).toContain('pasta-dish')
  })

  it('returns slug for matching cuisine query', () => {
    const bs = buildIndex([
      makeRecipe({ slug: 'carbonara', cuisine: 'italian' }),
      makeRecipe({ slug: 'moussaka', cuisine: 'greek' }),
    ])
    expect(bs.search('italian').map((r) => r.slug)).toContain('carbonara')
  })
})
