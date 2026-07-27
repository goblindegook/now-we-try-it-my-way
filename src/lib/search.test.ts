import type { Ingredient } from '@tmlmt/cooklang-parser'
import { describe, expect, it } from 'vitest'
import type { ParsedRecipe } from './cooklang'
import { buildGlobalSearchIndex, buildIngredientSearchIndex, buildSearchIndex } from './search'

function makeRecipe(overrides: Partial<ParsedRecipe> = {}): ParsedRecipe {
  return {
    slug: 'test-recipe',
    title: 'Test Recipe',
    description: '',
    category: 'Mains',
    cuisine: '',
    tags: [],
    diet: [],
    difficulty: '',
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

  it('returns slug for matching diet query', async () => {
    const bs = await buildSearchIndex([
      makeRecipe({ slug: 'gazpacho', diet: ['vegan', 'vegetarian'] }),
      makeRecipe({ slug: 'carbonara', diet: [] }),
    ])
    expect(bs.search('vegan').map((r) => r.slug)).toContain('gazpacho')
  })

  it('returns slug for matching difficulty query', async () => {
    const bs = await buildSearchIndex([
      makeRecipe({ slug: 'risotto', difficulty: 'easy' }),
      makeRecipe({ slug: 'carbonara', difficulty: '' }),
    ])
    expect(bs.search('easy').map((r) => r.slug)).toContain('risotto')
  })
})

describe('ingredient search index', () => {
  it('returns slug for matching ingredient name query', async () => {
    const bs = await buildIngredientSearchIndex([
      { slug: 'garlic', name: 'Garlic', body: 'Peel just before cooking.' },
      { slug: 'tomato', name: 'Tomato', body: 'Ripeness matters more than variety.' },
    ])
    expect(bs.search('garlic').map((r) => r.slug)).toContain('garlic')
  })

  it('does not return unrelated ingredients', async () => {
    const bs = await buildIngredientSearchIndex([
      { slug: 'garlic', name: 'Garlic', body: 'Peel just before cooking.' },
      { slug: 'tomato', name: 'Tomato', body: 'Ripeness matters more than variety.' },
    ])
    expect(bs.search('garlic').map((r) => r.slug)).not.toContain('tomato')
  })

  it('matches on the notes body text', async () => {
    const bs = await buildIngredientSearchIndex([{ slug: 'garlic', name: 'Garlic', body: 'Peel just before cooking.' }])
    expect(bs.search('cooking').map((r) => r.slug)).toContain('garlic')
  })

  it('tags every result with type "ingredient"', async () => {
    const bs = await buildIngredientSearchIndex([{ slug: 'garlic', name: 'Garlic', body: 'Notes.' }])
    const result = bs.search('garlic').find((r) => r.slug === 'garlic')
    expect(result?.type).toBe('ingredient')
  })

  it('builds index with photoSrc resolved per ingredient', async () => {
    const bs = await buildIngredientSearchIndex(
      [{ slug: 'garlic', name: 'Garlic', body: 'Notes.' }],
      async (ingredient) => `/_astro/${ingredient.slug}.webp`,
    )
    const result = bs.search('garlic').find((r) => r.slug === 'garlic')
    expect(result?.photoSrc).toBe('/_astro/garlic.webp')
  })

  it('stores null photoSrc when resolver is omitted', async () => {
    const bs = await buildIngredientSearchIndex([{ slug: 'garlic', name: 'Garlic', body: 'Notes.' }])
    const result = bs.search('garlic').find((r) => r.slug === 'garlic')
    expect(result?.photoSrc).toBeNull()
  })
})

describe('global search index', () => {
  it('matches both a recipe term and an ingredient term, tagged with the correct type', async () => {
    const bs = await buildGlobalSearchIndex(
      [makeRecipe({ slug: 'carbonara', title: 'Spaghetti carbonara' })],
      [{ slug: 'garlic', name: 'Garlic', body: 'Notes.' }],
    )
    const recipeResult = bs.search('carbonara').find((r) => r.slug === 'carbonara')
    const ingredientResult = bs.search('garlic').find((r) => r.slug === 'garlic')
    expect(recipeResult?.type).toBe('recipe')
    expect(ingredientResult?.type).toBe('ingredient')
  })

  it('keeps both documents when a recipe and an ingredient share the same slug', async () => {
    const bs = await buildGlobalSearchIndex(
      [makeRecipe({ slug: 'tomato', title: 'Tomato Galette' })],
      [{ slug: 'tomato', name: 'Tomato', body: 'Ripeness matters more than variety.' }],
    )

    const recipeResult = bs.search('galette').find((r) => r.slug === 'tomato' && r.type === 'recipe')
    const ingredientResult = bs.search('ripeness').find((r) => r.slug === 'tomato' && r.type === 'ingredient')

    expect(recipeResult?.type).toBe('recipe')
    expect(ingredientResult?.type).toBe('ingredient')
  })
})
