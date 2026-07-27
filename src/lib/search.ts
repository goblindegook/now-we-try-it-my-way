import type { Options } from '@pacote/bloom-search'
import { BloomSearch } from '@pacote/bloom-search'
import { stemmer } from 'stemmer'
import type { ParsedRecipe } from './cooklang'

export type IngredientForSearch = {
  slug: string
  name: string
  body: string
}

// Flat, not a discriminated union: @pacote/bloom-search's Options/BloomSearch
// generics constrain SummaryField/IndexField to `keyof Document`. `keyof` of a
// union collapses to only the properties common to every member (just
// `type`/`slug` here), which would make fields like `title`/`name` untypeable.
// Keeping SiteSearchDoc flat, with each variant's fields optional, sidesteps that.
export type SiteSearchDoc = {
  type: 'recipe' | 'ingredient'
  slug: string
  title?: string
  tags?: string
  ingredients?: string
  cuisine?: string
  diet?: string
  difficulty?: string
  category?: string
  prepTime?: string
  cookTime?: string
  photoSrc?: string | null
  name?: string
  body?: string
}

export type SearchIndexField =
  | 'title'
  | 'tags'
  | 'ingredients'
  | 'cuisine'
  | 'category'
  | 'diet'
  | 'difficulty'
  | 'name'
  | 'body'

export type SearchSummaryField =
  | 'slug'
  | 'title'
  | 'category'
  | 'cuisine'
  | 'prepTime'
  | 'cookTime'
  | 'photoSrc'
  | 'type'
  | 'name'

export const queryConfig: Options<SiteSearchDoc, SearchSummaryField, SearchIndexField> = {
  errorRate: 0.000001,
  fields: {
    title: 3,
    ingredients: 2,
    tags: 1,
    cuisine: 1,
    category: 1,
    diet: 1,
    difficulty: 1,
    name: 3,
    body: 1,
  },
  summary: ['slug', 'title', 'category', 'cuisine', 'prepTime', 'cookTime', 'photoSrc', 'type', 'name'],
  stemmer,
}

export const buildConfig: Options<SiteSearchDoc, SearchSummaryField, SearchIndexField> = {
  ...queryConfig,
  stopwords: (term) => term.length > 2,
}

type PhotoSrcResolver = (recipe: ParsedRecipe) => Promise<string | null> | string | null
type IngredientPhotoSrcResolver = (ingredient: IngredientForSearch) => Promise<string | null> | string | null
type SiteBloomSearch = BloomSearch<SiteSearchDoc, SearchSummaryField, SearchIndexField>

async function addRecipeDoc(bs: SiteBloomSearch, recipe: ParsedRecipe, resolvePhotoSrc: PhotoSrcResolver) {
  const photoSrc = await resolvePhotoSrc(recipe)
  bs.add(`recipe:${recipe.slug}`, {
    type: 'recipe',
    slug: recipe.slug,
    title: recipe.title,
    tags: recipe.tags.join(' '),
    ingredients: recipe.ingredients.map((i) => i.name).join(' '),
    diet: recipe.diet.join(' '),
    difficulty: recipe.difficulty,
    cuisine: recipe.cuisine,
    category: recipe.category,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    photoSrc,
  })
}

async function addIngredientDoc(
  bs: SiteBloomSearch,
  ingredient: IngredientForSearch,
  resolvePhotoSrc: IngredientPhotoSrcResolver,
) {
  const photoSrc = await resolvePhotoSrc(ingredient)
  bs.add(`ingredient:${ingredient.slug}`, {
    type: 'ingredient',
    slug: ingredient.slug,
    name: ingredient.name,
    body: ingredient.body,
    photoSrc,
  })
}

export async function buildSearchIndex(recipes: ParsedRecipe[], resolvePhotoSrc: PhotoSrcResolver = () => null) {
  const bs = new BloomSearch(buildConfig)
  for (const recipe of recipes) await addRecipeDoc(bs, recipe, resolvePhotoSrc)
  return bs
}

export async function buildIngredientSearchIndex(
  ingredients: IngredientForSearch[],
  resolvePhotoSrc: IngredientPhotoSrcResolver = () => null,
) {
  const bs = new BloomSearch(buildConfig)
  for (const ingredient of ingredients) await addIngredientDoc(bs, ingredient, resolvePhotoSrc)
  return bs
}

export async function buildGlobalSearchIndex(
  recipes: ParsedRecipe[],
  ingredients: IngredientForSearch[],
  resolveRecipePhotoSrc: PhotoSrcResolver = () => null,
  resolveIngredientPhotoSrc: IngredientPhotoSrcResolver = () => null,
) {
  const bs = new BloomSearch(buildConfig)
  for (const recipe of recipes) await addRecipeDoc(bs, recipe, resolveRecipePhotoSrc)
  for (const ingredient of ingredients) await addIngredientDoc(bs, ingredient, resolveIngredientPhotoSrc)
  return bs
}
