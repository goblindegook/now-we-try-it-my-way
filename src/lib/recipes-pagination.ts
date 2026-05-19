export const RECIPES_PER_PAGE = 12

export function getTotalPages(totalItems: number, perPage: number = RECIPES_PER_PAGE): number {
  return Math.max(1, Math.ceil(totalItems / perPage))
}

export function paginateRecipes<T>(
  recipes: T[],
  page: number,
  perPage: number = RECIPES_PER_PAGE,
): { pageItems: T[]; currentPage: number; totalPages: number } {
  const totalPages = getTotalPages(recipes.length, perPage)
  const currentPage = Math.min(Math.max(page, 1), totalPages)
  const startIndex = (currentPage - 1) * perPage

  return {
    pageItems: recipes.slice(startIndex, startIndex + perPage),
    currentPage,
    totalPages,
  }
}

export function recipePageHref(page: number): string {
  return page <= 1 ? '/recipes' : `/recipes/page/${page}`
}
