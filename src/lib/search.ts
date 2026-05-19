import type { Options } from '@pacote/bloom-search'
import { BloomSearch } from '@pacote/bloom-search'
import { stemmer } from 'stemmer'
import type { ParsedRecipe } from './cooklang'

export type RecipeSearchDoc = {
  title: string
  tags: string
  ingredients: string
  cuisine: string
  diet: string
  slug: string
  category: string
  prepTime: string
  cookTime: string
  photoSrc: string | null
}

export type SearchIndexField = 'title' | 'tags' | 'ingredients' | 'cuisine' | 'category' | 'diet'
export type SearchSummaryField = 'slug' | 'title' | 'category' | 'cuisine' | 'prepTime' | 'cookTime' | 'photoSrc'

export const queryConfig: Options<RecipeSearchDoc, SearchSummaryField, SearchIndexField> = {
  errorRate: 0.000001,
  fields: { title: 3, ingredients: 2, tags: 1, cuisine: 1, category: 1, diet: 1 },
  summary: ['slug', 'title', 'category', 'cuisine', 'prepTime', 'cookTime', 'photoSrc'],
  stemmer,
}

export const buildConfig: Options<RecipeSearchDoc, SearchSummaryField, SearchIndexField> = {
  ...queryConfig,
  stopwords: (term) => term.length > 2,
}

type PhotoSrcResolver = (recipe: ParsedRecipe) => Promise<string | null> | string | null

export async function buildSearchIndex(recipes: ParsedRecipe[], resolvePhotoSrc: PhotoSrcResolver = () => null) {
  const bs = new BloomSearch(buildConfig)
  for (const recipe of recipes) {
    const photoSrc = await resolvePhotoSrc(recipe)
    bs.add(recipe.slug, {
      title: recipe.title,
      tags: recipe.tags.join(' '),
      ingredients: recipe.ingredients.map((i) => i.name).join(' '),
      diet: recipe.diet?.join(' ') ?? '',
      cuisine: recipe.cuisine,
      slug: recipe.slug,
      category: recipe.category,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      photoSrc,
    })
  }
  return bs
}
