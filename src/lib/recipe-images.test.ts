import { describe, expect, it } from 'vitest'
import { candidatePhotoPaths } from './recipe-images'

describe('candidatePhotoPaths', () => {
  it('returns normalized absolute path when photo starts with /src/assets/recipes/', () => {
    const paths = candidatePhotoPaths('/src/assets/recipes/desserts/pastel-de-nata.jpeg', 'Desserts', 'pastel-de-nata')
    expect(paths).toEqual(['/src/assets/recipes/desserts/pastel-de-nata.jpeg'])
  })

  it('returns normalized path when photo uses /photos/ prefix', () => {
    const paths = candidatePhotoPaths('/photos/desserts/pastel-de-nata.jpeg', 'Desserts', 'pastel-de-nata')
    expect(paths).toEqual(['/src/assets/recipes/desserts/pastel-de-nata.jpeg'])
  })

  it('returns category-prefixed path when photo is a bare filename', () => {
    const paths = candidatePhotoPaths('pastel-de-nata.jpeg', 'Desserts', 'pastel-de-nata')
    expect(paths).toEqual(['/src/assets/recipes/desserts/pastel-de-nata.jpeg'])
  })

  it('converts multi-word category to kebab-case folder', () => {
    const paths = candidatePhotoPaths('my-dish.jpeg', 'Main Dishes', 'my-dish')
    expect(paths).toEqual(['/src/assets/recipes/main-dishes/my-dish.jpeg'])
  })

  it('falls back to slug-based paths for each supported extension when photo is absent', () => {
    const paths = candidatePhotoPaths(undefined, 'Desserts', 'new-york-cheesecake')
    expect(paths).toEqual([
      '/src/assets/recipes/desserts/new-york-cheesecake.avif',
      '/src/assets/recipes/desserts/new-york-cheesecake.gif',
      '/src/assets/recipes/desserts/new-york-cheesecake.jpeg',
      '/src/assets/recipes/desserts/new-york-cheesecake.jpg',
      '/src/assets/recipes/desserts/new-york-cheesecake.png',
      '/src/assets/recipes/desserts/new-york-cheesecake.webp',
    ])
  })

  it('falls back to slug-based paths when photo is empty string', () => {
    const paths = candidatePhotoPaths('', 'Breads', 'sourdough-bread')
    expect(paths).toEqual([
      '/src/assets/recipes/breads/sourdough-bread.avif',
      '/src/assets/recipes/breads/sourdough-bread.gif',
      '/src/assets/recipes/breads/sourdough-bread.jpeg',
      '/src/assets/recipes/breads/sourdough-bread.jpg',
      '/src/assets/recipes/breads/sourdough-bread.png',
      '/src/assets/recipes/breads/sourdough-bread.webp',
    ])
  })

  it('returns empty array when photo absent and no category', () => {
    const paths = candidatePhotoPaths(undefined, undefined, 'some-recipe')
    expect(paths).toEqual([])
  })

  it('returns empty array when photo absent and no slug', () => {
    const paths = candidatePhotoPaths(undefined, 'Desserts', undefined)
    expect(paths).toEqual([])
  })

  it('returns empty array when photo absent and neither category nor slug', () => {
    const paths = candidatePhotoPaths(undefined, undefined, undefined)
    expect(paths).toEqual([])
  })
})
