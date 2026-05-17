export const CATEGORIES = ['Starters', 'Mains', 'Sides', 'Sauces', 'Breads', 'Desserts'] as const
export type Category = (typeof CATEGORIES)[number]

export function sortCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const ai = CATEGORIES.indexOf(a as Category)
    const bi = CATEGORIES.indexOf(b as Category)
    const aIdx = ai === -1 ? Infinity : ai
    const bIdx = bi === -1 ? Infinity : bi
    return aIdx - bIdx
  })
}
