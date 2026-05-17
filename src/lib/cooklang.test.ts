import { describe, expect, it } from 'vitest'
import { parseRecipe } from './cooklang'

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

    it('returns empty tags array when tags metadata is absent', () => {
      const r = parseRecipe('Boil water.', 'r')
      expect(r.tags).toEqual([])
    })

    it('extracts category', () => {
      const r = parseRecipe(withFrontmatter('category: Mains'), 'r')
      expect(r.category).toBe('Mains')
    })

    it('defaults category to Other when absent', () => {
      const r = parseRecipe('Boil water.', 'r')
      expect(r.category).toBe('Other')
    })

    it('extracts slug as-is', () => {
      const r = parseRecipe('Boil water.', 'pasta-carbonara')
      expect(r.slug).toBe('pasta-carbonara')
    })
  })

  describe('ingredients', () => {
    it('parses ingredient name and units', () => {
      const r = parseRecipe('Add @spaghetti{400%g}.', 'r')
      expect(r.ingredients[0]).toMatchObject({ name: 'spaghetti', unit: 'g' })
    })

    it('parses ingredient quantity structure', () => {
      const r = parseRecipe('Add @egg yolks{4}.', 'r')
      expect(r.ingredients[0].quantity).toMatchObject({
        type: 'fixed',
        value: { type: 'decimal', value: 4 },
      })
    })

    it('collects all ingredients across steps', () => {
      const r = parseRecipe('Add @spaghetti{400%g}.\n\nAdd @salt{1%tsp}.', 'r')
      expect(r.ingredients).toHaveLength(2)
    })

    it('produces an ingredient item in the step', () => {
      const r = parseRecipe('Add @spaghetti{400%g}.', 'r')
      const item = r.steps[0].items.find((i) => i.type === 'ingredient')
      expect(item).toMatchObject({ type: 'ingredient', index: 0 })
    })
  })

  describe('timers', () => {
    it('produces a timer item in a step', () => {
      const r = parseRecipe('Cook for ~{30%seconds}.', 'r')
      const item = r.steps[0].items.find((i) => i.type === 'timer')
      expect(item).toMatchObject({ type: 'timer', index: 0 })
    })

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
    it('produces a cookware item in the step', () => {
      const r = parseRecipe('Heat a #skillet{}.', 'r')
      const item = r.steps[0].items.find((i) => i.type === 'cookware')
      expect(item).toMatchObject({ type: 'cookware', index: 0 })
    })

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

    it('includes plain text items in a step', () => {
      const r = parseRecipe('Boil water.', 'r')
      expect(r.steps[0].items.some((i) => i.type === 'text')).toBe(true)
    })
  })
})
