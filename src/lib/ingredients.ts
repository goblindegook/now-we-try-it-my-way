export type IngredientRef = {
  slug: string
  name: string
}

export function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase()
}

function matchIngredientName(a: string, b: string): boolean {
  return normalizeIngredientName(a) === normalizeIngredientName(b)
}

export function computeSymmetricPairings(entries: { name: string; pairings?: string[] }[]): Map<string, string[]> {
  const result = new Map<string, string[]>()

  for (const entry of entries) {
    result.set(entry.name, [...(entry.pairings ?? [])])
  }

  for (const entry of entries) {
    for (const pairingName of entry.pairings ?? []) {
      const target = entries.find((candidate) => matchIngredientName(candidate.name, pairingName))
      if (!target) continue

      const existing = result.get(target.name) ?? []
      const alreadyListed = existing.some((name) => matchIngredientName(name, entry.name))
      if (!alreadyListed) existing.push(entry.name)
      result.set(target.name, existing)
    }
  }

  return result
}

export function resolveIngredientSlug(name: string, entries: IngredientRef[]): string | undefined {
  return entries.find((entry) => matchIngredientName(entry.name, name))?.slug
}

export function buildIngredientSlugIndex(
  entries: { slug: string; name: string; aliases?: string[] }[],
): Map<string, string> {
  const index = new Map<string, string>()
  for (const entry of entries) {
    for (const name of [entry.name, ...(entry.aliases ?? [])]) {
      index.set(name, entry.slug)
    }
  }
  return index
}

export function findRecipesUsingIngredient<T extends { ingredients: { name: string }[] }>(
  names: string[],
  recipes: T[],
): T[] {
  return recipes.filter((recipe) =>
    recipe.ingredients.some((ingredient) => names.some((name) => matchIngredientName(ingredient.name, name))),
  )
}
