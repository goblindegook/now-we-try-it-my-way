import type { ImageMetadata } from 'astro'

const recipeImageModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/recipes/**/*.{avif,gif,jpeg,jpg,png,webp}',
  { eager: true },
)

const recipeImagesByPath = new Map<string, ImageMetadata>()
for (const [path, mod] of Object.entries(recipeImageModules)) {
  recipeImagesByPath.set(path, mod.default)
}

function normalizeRecipePhotoPath(photo: string): string | null {
  const value = photo.trim()
  if (!value) return null
  if (value.startsWith('/src/assets/recipes/')) return value
  if (value.startsWith('/photos/')) return `/src/assets/recipes/${value.slice('/photos/'.length)}`
  return null
}

function categoryToFolder(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, '-')
}

function normalizeRecipePhotoPathWithCategory(photo: string, category?: string): string | null {
  const normalized = normalizeRecipePhotoPath(photo)
  if (normalized) return normalized

  const value = photo.trim().replace(/^\.?\//, '')
  if (!value) return null
  if (!category) return null

  const folder = categoryToFolder(category)
  return `/src/assets/recipes/${folder}/${value}`
}

export function resolveRecipePhoto(photo: string, category?: string): ImageMetadata | null {
  const normalized = normalizeRecipePhotoPathWithCategory(photo, category)
  if (!normalized) return null
  return recipeImagesByPath.get(normalized) ?? null
}
