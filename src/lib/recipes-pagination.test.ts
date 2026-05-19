import { describe, expect, it } from 'vitest'
import { getTotalPages, pageHref, paginateRecipes, recipePageHref } from './recipes-pagination'

describe('recipes-pagination', () => {
  it('returns at least 1 page', () => {
    expect(getTotalPages(0)).toBe(1)
  })

  it('paginates and clamps current page', () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1)
    const page1 = paginateRecipes(items, 1, 12)
    const page3 = paginateRecipes(items, 3, 12)
    const page99 = paginateRecipes(items, 99, 12)

    expect(page1.pageItems).toHaveLength(12)
    expect(page1.currentPage).toBe(1)

    expect(page3.pageItems).toEqual([25])
    expect(page3.currentPage).toBe(3)

    expect(page99.currentPage).toBe(3)
  })

  it('builds default recipes page hrefs', () => {
    expect(recipePageHref(1)).toBe('/recipes')
    expect(recipePageHref(2)).toBe('/recipes/page/2')
  })

  it('builds category page hrefs from base path', () => {
    expect(pageHref('/mains', 1)).toBe('/mains')
    expect(pageHref('/mains', 2)).toBe('/mains/page/2')
  })
})
