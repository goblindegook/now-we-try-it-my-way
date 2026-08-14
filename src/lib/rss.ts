import type { RSSFeedItem } from '@astrojs/rss'
import type { FixedValue, Range } from '@tmlmt/cooklang-parser'
import { escape as escapeEntities } from 'html-escaper'
import type { ParsedRecipe } from './cooklang'
import { sortRecipesByRecency } from './cooklang'
import { resolveRecipePhoto } from './recipe-images'
import { smarten } from './smarten'

const RSS_FALLBACK_DATE = new Date('1970-01-01T00:00:00.000Z')

function formatQuantityValue(value: QuantityValue): string {
  if (value.type === 'decimal') return String(value.value)
  if (value.type === 'fraction') return `${value.num}/${value.den}`
  return value.value
}

type QuantityValue = FixedValue['value'] | Range['min']

function toFeedDate(input: string): Date {
  const parsed = new Date(input)
  return Number.isNaN(parsed.getTime()) ? RSS_FALLBACK_DATE : parsed
}

function formatQuantity(quantity?: FixedValue | Range): string {
  if (!quantity) return ''
  if (quantity.type === 'fixed') return formatQuantityValue(quantity.value)
  const min = formatQuantityValue(quantity.min)
  const max = formatQuantityValue(quantity.max)
  return `${min}-${max}`
}

function ingredientText(recipe: ParsedRecipe, index: number, quantityPartIndex?: number, displayName?: string): string {
  const ingredient = recipe.ingredients[index]
  if (!ingredient) return ''
  const part = quantityPartIndex === undefined ? undefined : ingredient.quantityParts?.[quantityPartIndex]
  const amount = formatQuantity(part?.value ?? ingredient.quantity)
  const units = part?.unit ?? ingredient.unit ?? ''
  const prefix = amount ? `${amount}${units ? ` ${units}` : ''} ` : ''
  const name = displayName?.trim() || ingredient.name
  const preparation = ingredient.preparation ? ` (${ingredient.preparation})` : ''
  return `${prefix}${name}${preparation}`
}

function itemText(recipe: ParsedRecipe, item: ParsedRecipe['steps'][number]['items'][number]): string {
  if (item.type === 'text') return smarten(item.value)
  if (item.type === 'ingredient') return ingredientText(recipe, item.index, item.quantityPartIndex, item.displayName)
  if (item.type === 'cookware') return recipe.cookware[item.index]?.name ?? ''

  const timer = recipe.timers[item.index]
  if (!timer) return ''
  const amount = formatQuantity(timer.duration)
  return `${amount} ${timer.unit}`.trim()
}

function imageMimeType(format: string): string {
  if (format === 'png') return 'image/png'
  if (format === 'gif') return 'image/gif'
  if (format === 'webp') return 'image/webp'
  if (format === 'avif') return 'image/avif'
  return 'image/jpeg'
}

function imageMetaCustomData(imageUrl: URL, imageFormat: string): string {
  const safeUrl = escapeEntities(imageUrl.toString())
  const type = escapeEntities(imageMimeType(imageFormat))
  return `<media:content url="${safeUrl}" medium="image" type="${type}" /><media:thumbnail url="${safeUrl}" />`
}

function recipeCategories(recipe: ParsedRecipe): string[] | undefined {
  const values = new Set<string>()

  const category = recipe.category.trim().toLowerCase()
  if (category) values.add(category)

  for (const tag of recipe.tags) {
    const normalized = tag.trim().toLowerCase()
    if (normalized) values.add(normalized)
  }

  return values.size > 0 ? [...values].sort() : undefined
}

function renderSectionIngredients(recipe: ParsedRecipe, section: ParsedRecipe['sections'][number]): string[] {
  const seen = new Set<string>()
  const items: string[] = []

  for (const step of section.steps) {
    for (const item of step.items) {
      if (item.type !== 'ingredient') continue
      const key = `${item.index}:${item.quantityPartIndex ?? -1}`
      if (seen.has(key)) continue
      seen.add(key)
      items.push(ingredientText(recipe, item.index, item.quantityPartIndex))
    }
  }

  return items
}

function renderStepList(recipe: ParsedRecipe, steps: ParsedRecipe['steps']): string {
  return steps
    .map((step) =>
      step.items
        .map((item) => itemText(recipe, item))
        .join('')
        .replaceAll(/\s+/g, ' ')
        .trim(),
    )
    .map((text) => `<li>${escapeEntities(text)}</li>`)
    .join('')
}

function renderRecipeContent(recipe: ParsedRecipe): string {
  const hasNamedSections = recipe.sections.some((section) => section.name.trim())
  const ingredients = hasNamedSections
    ? recipe.sections
        .map((section) => {
          const sectionIngredients = renderSectionIngredients(recipe, section)
          if (sectionIngredients.length === 0) return ''
          const heading = section.name ? `<h3>${escapeEntities(section.name)}</h3>` : ''
          const list = sectionIngredients.map((entry) => `<li>${escapeEntities(entry)}</li>`).join('')
          return `${heading}<ul>${list}</ul>`
        })
        .join('')
    : `<ul>${recipe.ingredients
        .map((ingredient) => {
          const amount = formatQuantity(ingredient.quantity)
          const units = ingredient.unit ?? ''
          const prefix = amount ? `${amount}${units ? ` ${units}` : ''} ` : ''
          const preparation = ingredient.preparation ? ` (${ingredient.preparation})` : ''
          return `<li>${escapeEntities(`${prefix}${ingredient.name}${preparation}`.trim())}</li>`
        })
        .join('')}</ul>`

  const instructions = hasNamedSections
    ? recipe.sections
        .filter((section) => section.steps.length > 0)
        .map((section) => {
          const heading = section.name ? `<h3>${escapeEntities(section.name)}</h3>` : ''
          return `${heading}<ol>${renderStepList(recipe, section.steps)}</ol>`
        })
        .join('')
    : `<ol>${renderStepList(recipe, recipe.steps)}</ol>`

  return `<h2>Ingredients</h2>${ingredients}<h2>Instructions</h2>${instructions}`
}

export function buildRecipeRssItems(recipes: ParsedRecipe[], site: URL): RSSFeedItem[] {
  const sorted = sortRecipesByRecency([...recipes])

  return sorted.map((recipe) => {
    const image = resolveRecipePhoto(recipe.photo, recipe.category, recipe.slug)

    return {
      title: smarten(recipe.title),
      description: smarten(recipe.description || recipe.title),
      link: new URL(`/recipes/${recipe.slug}`, site).toString(),
      pubDate: toFeedDate(recipe.date),
      categories: recipeCategories(recipe),
      content: renderRecipeContent(recipe),
      customData: image ? imageMetaCustomData(new URL(image.src, site), image?.format ?? 'jpg') : undefined,
    }
  })
}
