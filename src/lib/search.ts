import type { Options } from '@pacote/bloom-search'
import { stemmer } from 'stemmer'
import type { ParsedRecipe } from './cooklang'

export type RecipeSearchDoc = {
  title: string
  tags: string
  ingredients: string
  cuisine: string
  slug: string
  category: string
  prepTime: string
  cookTime: string
  photoSrc: string | null
}

export type SearchIndexField = 'title' | 'tags' | 'ingredients' | 'cuisine'
export type SearchSummaryField = 'slug' | 'title' | 'category' | 'cuisine' | 'prepTime' | 'cookTime' | 'photoSrc'

export const queryConfig: Options<RecipeSearchDoc, SearchSummaryField, SearchIndexField> = {
  errorRate: 0.00005,
  fields: { title: 3, tags: 2, ingredients: 2, cuisine: 1 },
  summary: ['slug', 'title', 'category', 'cuisine', 'prepTime', 'cookTime', 'photoSrc'],
  stemmer,
}

export const buildConfig: Options<RecipeSearchDoc, SearchSummaryField, SearchIndexField> = {
  ...queryConfig,
  stopwords: (term) => term.length > 2,
}

export function toSearchDocument(recipe: ParsedRecipe, photoSrc: string | null): RecipeSearchDoc {
  return {
    title: recipe.title,
    tags: recipe.tags.join(' '),
    ingredients: recipe.ingredients.map((i) => i.name).join(' '),
    cuisine: recipe.cuisine,
    slug: recipe.slug,
    category: recipe.category,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    photoSrc,
  }
}
