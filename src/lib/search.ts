import type { Options } from '@pacote/signature-search'
import { SignatureSearch } from '@pacote/signature-search'
import { stemmer } from 'stemmer'
import type { ParsedRecipe } from './cooklang'

export type IngredientForSearch = {
  slug: string
  name: string
  aliases?: string[]
  body: string
}

// Options/SignatureSearch generics constrain SummaryField/IndexField to `keyof
// Document`. `keyof` of a union collapses to only the properties common to
// every member (just `type`/`slug` here), which would make fields like
// `title`/`name` untypeable. Keeping SiteSearchDoc flat, with each variant's
// fields optional, sidesteps that.
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
  aliases?: string
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
  | 'aliases'
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
  errorRate: 0.0000001,
  fields: {
    title: 3,
    ingredients: 2,
    tags: 1,
    cuisine: 1,
    category: 1,
    diet: 1,
    difficulty: 1,
    name: 3,
    aliases: 3,
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
type SiteSignatureSearch = SignatureSearch<SiteSearchDoc, SearchSummaryField, SearchIndexField>

function addRecipeDoc(bs: SiteSignatureSearch, index: number, recipe: ParsedRecipe, photoSrc: string | null) {
  bs.add(String(index), {
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

function addIngredientDoc(
  bs: SiteSignatureSearch,
  index: number,
  ingredient: IngredientForSearch,
  photoSrc: string | null,
) {
  bs.add(String(index), {
    type: 'ingredient',
    slug: ingredient.slug,
    name: ingredient.name,
    aliases: ingredient.aliases?.join(' '),
    body: ingredient.body,
    photoSrc,
  })
}

export async function buildSearchIndex(recipes: ParsedRecipe[], resolvePhotoSrc: PhotoSrcResolver = () => null) {
  const bs = new SignatureSearch(buildConfig)
  for (const [i, recipe] of recipes.entries()) addRecipeDoc(bs, i, recipe, await resolvePhotoSrc(recipe))
  return bs
}

export async function buildIngredientSearchIndex(
  ingredients: IngredientForSearch[],
  resolvePhotoSrc: IngredientPhotoSrcResolver = () => null,
) {
  const bs = new SignatureSearch(buildConfig)
  for (const [i, ingredient] of ingredients.entries())
    addIngredientDoc(bs, i, ingredient, await resolvePhotoSrc(ingredient))
  return bs
}

export async function buildGlobalSearchIndex(
  recipes: ParsedRecipe[],
  ingredients: IngredientForSearch[],
  resolveRecipePhotoSrc: PhotoSrcResolver = () => null,
  resolveIngredientPhotoSrc: IngredientPhotoSrcResolver = () => null,
) {
  const bs = new SignatureSearch(buildConfig)
  for (const [i, recipe] of recipes.entries()) addRecipeDoc(bs, i, recipe, await resolveRecipePhotoSrc(recipe))
  for (const [i, ingredient] of ingredients.entries()) {
    addIngredientDoc(bs, recipes.length + i, ingredient, await resolveIngredientPhotoSrc(ingredient))
  }
  return bs
}
