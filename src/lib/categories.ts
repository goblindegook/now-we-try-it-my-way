export const CATEGORIES = ['Starters', 'Mains', 'Sides', 'Sauces', 'Breads', 'Desserts', 'Drinks'] as const
export type Category = (typeof CATEGORIES)[number]

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    const ai = CATEGORIES.indexOf(a)
    const bi = CATEGORIES.indexOf(b)
    const aIdx = ai === -1 ? Infinity : ai
    const bIdx = bi === -1 ? Infinity : bi
    return aIdx - bIdx
  })
}
