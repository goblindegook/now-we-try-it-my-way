import { type Cookware, type Ingredient, type Item, type Metadata, Recipe, type Timer } from '@tmlmt/cooklang-parser'

export type RecipeStep = {
  items: Item[]
  note: string | null
}

export type RecipeSection = {
  name: string
  steps: RecipeStep[]
}

export type RecipeMeta = {
  slug: string
  title: string
  description: string
  category: string
  tags: string[]
  servings: number
  photo: string
  prepTime: string
  cookTime: string
  date: string
}

export type ParsedRecipe = RecipeMeta & {
  ingredients: Ingredient[]
  timers: Timer[]
  sections: RecipeSection[]
  steps: RecipeStep[]
  cookware: Cookware[]
}

function extractFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}

  const result: Record<string, string> = {}
  const lines = match[1].split('\n')
  for (const line of lines) {
    const parts = line.match(/^([^:#]+):\s*(.+)\s*$/)
    if (!parts) continue
    const key = parts[1].trim().toLowerCase()
    const value = parts[2].trim().replace(/^['"]|['"]$/g, '')
    result[key] = value
  }
  return result
}

function pickFirstString(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
      return candidate.toISOString().slice(0, 10)
    }
    if (typeof candidate === 'number' || typeof candidate === 'boolean') {
      return String(candidate)
    }
  }
  return ''
}

function toRecipeMeta(recipe: Recipe, slug: string): RecipeMeta {
  const metadata: Metadata = recipe.metadata

  return {
    slug,
    title: pickFirstString(metadata.title) || slug.replace(/-/g, ' '),
    description: pickFirstString(metadata.description, metadata.introduction),
    category: pickFirstString(metadata.category, metadata.course) || 'Other',
    tags: metadata.tags ?? [],
    servings: recipe.servings ?? 4,
    photo: pickFirstString(metadata.image, metadata.picture, metadata.images?.[0], metadata.pictures?.[0]),
    prepTime: pickFirstString(metadata['prep time'], metadata['time.prep']),
    cookTime: pickFirstString(metadata['cook time'], metadata['time.cook']),
    date: pickFirstString(
      (metadata as Record<string, unknown>).created,
      (metadata as Record<string, unknown>).date,
      (metadata as Record<string, unknown>)['last modified'],
      (metadata as Record<string, unknown>).updated,
    ),
  }
}

function toSortableTimestamp(date: string): number {
  const parsed = Date.parse(date)
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

export function sortRecipesByRecency(recipes: ParsedRecipe[]): ParsedRecipe[] {
  return recipes.sort((a, b) => {
    if (a.date && b.date) {
      const delta = toSortableTimestamp(b.date) - toSortableTimestamp(a.date)
      if (delta !== 0) return delta
    } else if (a.date) {
      return -1
    } else if (b.date) {
      return 1
    }

    return a.title.localeCompare(b.title)
  })
}

export function sortRecipesAlphabetically(recipes: ParsedRecipe[]): ParsedRecipe[] {
  return recipes.sort((a, b) => a.title.localeCompare(b.title))
}

export function getAllTags(recipes: RecipeMeta[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()

  for (const recipe of recipes) {
    for (const tag of recipe.tags) {
      if (typeof tag !== 'string') continue
      const normalized = tag.trim().toLowerCase()
      if (!normalized) continue
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag))
}

export function parseRecipe(content: string, slug: string): ParsedRecipe {
  const frontmatter = extractFrontmatter(content)
  const recipe = new Recipe(content)
  const baseMeta = toRecipeMeta(recipe, slug)
  const sections: RecipeSection[] = []
  const steps: RecipeStep[] = []

  for (const section of recipe.sections) {
    const sectionSteps: RecipeStep[] = []

    for (const part of section.content) {
      if (part.type === 'note') {
        const previous = sectionSteps[sectionSteps.length - 1]
        if (previous) previous.note = previous.note ? `${previous.note}\n${part.note}` : part.note
        continue
      }
      if (part.type === 'step') {
        const step: RecipeStep = { items: part.items, note: null }
        sectionSteps.push(step)
        steps.push(step)
      }
    }

    sections.push({
      name: section.name,
      steps: sectionSteps,
    })
  }

  return {
    ...baseMeta,
    date: pickFirstString(
      frontmatter.created,
      frontmatter.date,
      frontmatter['last modified'],
      frontmatter.updated,
      baseMeta.date,
    ),
    ingredients: recipe.ingredients,
    timers: recipe.timers,
    sections,
    steps,
    cookware: recipe.cookware,
  }
}

export async function loadAllRecipes(): Promise<ParsedRecipe[]> {
  const files = import.meta.glob('/src/content/recipes/**/*.cook', {
    query: '?raw',
    import: 'default',
  })
  const recipes: ParsedRecipe[] = []

  for (const [path, load] of Object.entries(files)) {
    const content = await (load as () => Promise<string>)()
    const slug = path.split('/').pop()?.replace('.cook', '') ?? ''
    const recipe = parseRecipe(content, slug)
    recipes.push(recipe)
  }

  return sortRecipesAlphabetically(recipes)
}
