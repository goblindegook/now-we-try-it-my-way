import { describe, expect, it } from 'vitest'
import { getAllTags, type ParsedRecipe, parseRecipe, sortRecipesAlphabetically, sortRecipesByRecency } from './cooklang'

function withFrontmatter(meta: string, body = 'Boil water.'): string {
  return `---\n${meta}\n---\n\n${body}`
}

describe('parseRecipe', () => {
  describe('metadata', () => {
    it('extracts title from metadata', () => {
      const r = parseRecipe(withFrontmatter('title: Pasta Carbonara'), 'pasta-carbonara')
      expect(r.title).toBe('Pasta Carbonara')
    })

    it('falls back to slug-derived title when title metadata is absent', () => {
      const r = parseRecipe('Boil water.', 'my-pasta-recipe')
      expect(r.title).toBe('my pasta recipe')
    })

    it('extracts servings as a number', () => {
      const r = parseRecipe(withFrontmatter('servings: 6'), 'r')
      expect(r.servings).toBe(6)
    })

    it('defaults servings to 4 when absent', () => {
      const r = parseRecipe('Boil water.', 'r')
      expect(r.servings).toBe(4)
    })

    it('parses tags into an array', () => {
      const r = parseRecipe(withFrontmatter('tags: [Italian, Quick, Pasta]'), 'r')
      expect(r.tags).toEqual(['Italian', 'Quick', 'Pasta'])
    })

    it('parses block-list tags into an array', () => {
      const r = parseRecipe(withFrontmatter('tags:\n  - Italian\n  - Quick\n  - Pasta'), 'r')
      expect(r.tags).toEqual(['Italian', 'Quick', 'Pasta'])
    })

    it('returns empty tags array when tags metadata is absent', () => {
      const r = parseRecipe('Boil water.', 'r')
      expect(r.tags).toEqual([])
    })

    it('extracts category', () => {
      const r = parseRecipe(withFrontmatter('category: Mains'), 'r')
      expect(r.category).toBe('Mains')
    })

    it('defaults category to More when absent', () => {
      const r = parseRecipe('Boil water.', 'r')
      expect(r.category).toBe('More')
    })

    it('extracts slug as-is', () => {
      const r = parseRecipe('Boil water.', 'pasta-carbonara')
      expect(r.slug).toBe('pasta-carbonara')
    })

    it('prefers created metadata for recipe date when both created and updated exist', () => {
      const r = parseRecipe(withFrontmatter('created: 2026-05-18\nupdated: 2026-05-17'), 'r')
      expect(r.date).toBe('2026-05-18')
    })

    it('extracts cuisine normalized to lowercase', () => {
      const r = parseRecipe(withFrontmatter('cuisine: Italian'), 'r')
      expect(r.cuisine).toBe('italian')
    })

    it('defaults cuisine to empty string when absent', () => {
      const r = parseRecipe('Boil water.', 'r')
      expect(r.cuisine).toBe('')
    })

    it('parses block-list diet into an array', () => {
      const r = parseRecipe(withFrontmatter('diet:\n  - vegan\n  - vegetarian'), 'r')
      expect(r.diet).toEqual(['vegan', 'vegetarian'])
    })

    it('returns empty diet array when diet metadata is absent', () => {
      const r = parseRecipe('Boil water.', 'r')
      expect(r.diet).toEqual([])
    })

    it('extracts difficulty normalized to lowercase', () => {
      const r = parseRecipe(withFrontmatter('difficulty: Easy'), 'r')
      expect(r.difficulty).toBe('easy')
    })

    it('returns empty string for difficulty when absent', () => {
      const r = parseRecipe('Boil water.', 'r')
      expect(r.difficulty).toBe('')
    })
  })

  describe('ingredients', () => {
    it('parses ingredient name and units', () => {
      const r = parseRecipe('Add @spaghetti{400%g}.', 'r')
      expect(r.ingredients[0]).toMatchObject({ name: 'spaghetti', unit: 'g' })
    })

    it('collects all ingredients across steps', () => {
      const r = parseRecipe('Add @spaghetti{400%g}.\n\nAdd @salt{1%tsp}.', 'r')
      expect(r.ingredients).toHaveLength(2)
    })
  })

  describe('timers', () => {
    it('collects timers at recipe level', () => {
      const r = parseRecipe('Cook for ~{30%seconds}.', 'r')
      expect(r.timers).toHaveLength(1)
    })

    it('keeps timer units from parser', () => {
      const r = parseRecipe('Cook for ~{30%seconds}.', 'r')
      expect(r.timers[0].unit).toBe('seconds')
    })
  })

  describe('cookware', () => {
    it('collects cookware items', () => {
      const r = parseRecipe('Heat a #skillet{}.', 'r')
      expect(r.cookware[0]).toMatchObject({ name: 'skillet' })
    })
  })

  describe('steps', () => {
    it('produces one step per paragraph', () => {
      const r = parseRecipe('Step one.\n\nStep two.', 'r')
      expect(r.steps).toHaveLength(2)
    })
  })

  describe('smart punctuation', () => {
    it('curls apostrophes in the title', () => {
      const r = parseRecipe(withFrontmatter("title: Nonna's Sunday Sauce"), 'r')
      expect(r.title).toBe('Nonna’s Sunday Sauce')
    })

    it('curls quotes in the description', () => {
      const r = parseRecipe(withFrontmatter('description: The chef\'s "secret" trick'), 'r')
      expect(r.description).toBe('The chef’s “secret” trick')
    })

    it('curls apostrophes in step text', () => {
      const r = parseRecipe("Simmer, don't rush it, until thick.", 'r')
      const text = r.steps[0].items.find((i) => i.type === 'text')
      expect(text?.value).toContain('don’t')
    })

    it('curls quotes in step notes', () => {
      const r = parseRecipe('Add salt.\n\n> Use "flaky" salt.', 'r')
      expect(r.steps[0].note).toBe('Use “flaky” salt.')
    })

    it('leaves ingredient, cookware, and timer names untouched', () => {
      const r = parseRecipe('Add @spaghetti{400%g} to the #pot{} and cook for ~{10%minutes}.', 'r')
      expect(r.ingredients[0].name).toBe('spaghetti')
      expect(r.cookware[0].name).toBe('pot')
      expect(r.timers[0].unit).toBe('minutes')
    })
  })
})

describe('sorting helpers', () => {
  function recipe(title: string, date: string): ParsedRecipe {
    return {
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      title,
      description: '',
      category: 'Mains',
      cuisine: '',
      tags: [],
      servings: 4,
      photo: '',
      prepTime: '',
      cookTime: '',
      date,
      difficulty: '',
      diet: [],
      ingredients: [],
      timers: [],
      sections: [],
      steps: [],
      cookware: [],
    }
  }

  it('orders recipes alphabetically by title', () => {
    const sorted = sortRecipesAlphabetically([recipe('Zucchini', '2026-05-18'), recipe('Apple Pie', '2026-05-17')])
    expect(sorted.map((r) => r.title)).toEqual(['Apple Pie', 'Zucchini'])
  })

  it('orders newer dated recipes before older ones for homepage recency', () => {
    const sorted = sortRecipesByRecency([recipe('Yesterday', '2026-05-17'), recipe('Today', '2026-05-18')])
    expect(sorted.map((r) => r.title)).toEqual(['Today', 'Yesterday'])
  })
})

describe('getAllTags', () => {
  function recipeWithTags(title: string, tags: string[]): ParsedRecipe {
    return {
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      title,
      description: '',
      category: 'Mains',
      cuisine: '',
      tags,
      servings: 4,
      photo: '',
      prepTime: '',
      cookTime: '',
      date: '',
      difficulty: '',
      diet: [],
      ingredients: [],
      timers: [],
      sections: [],
      steps: [],
      cookware: [],
    }
  }

  it('normalizes tags to lowercase, filters blanks, deduplicates, counts, and sorts alphabetically', () => {
    const result = getAllTags([
      recipeWithTags('A', ['Italian', 'Quick', '', '  ', 'Pasta']),
      recipeWithTags('B', ['quick', 'PASTA', 'weeknight']),
      recipeWithTags('C', ['italian', 'Weeknight', '']),
    ])

    expect(result).toEqual([
      { tag: 'italian', count: 2 },
      { tag: 'pasta', count: 2 },
      { tag: 'quick', count: 2 },
      { tag: 'weeknight', count: 2 },
    ])
  })
})
