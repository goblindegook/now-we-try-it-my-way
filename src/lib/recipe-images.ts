import type { ImageMetadata } from 'astro'

const recipeImageModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/recipes/**/*.{avif,gif,jpeg,jpg,png,webp}',
  { eager: true },
)

const recipeImagesByPath = new Map<string, ImageMetadata>()
for (const [path, mod] of Object.entries(recipeImageModules)) {
  recipeImagesByPath.set(path, mod.default)
}

const SUPPORTED_EXTENSIONS = ['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp']

function normalizeRecipePhotoPath(photo?: string): string | null {
  const value = photo?.trim()
  if (!value) return null
  if (value.startsWith('/src/assets/recipes/')) return value
  if (value.startsWith('/photos/')) return `/src/assets/recipes/${value.slice('/photos/'.length)}`
  return null
}

function categoryToFolder(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, '-')
}

export function candidatePhotoPaths(
  photo: string | undefined,
  category: string | undefined,
  slug: string | undefined,
): string[] {
  const normalized = normalizeRecipePhotoPath(photo)
  if (normalized) return [normalized]

  const value = photo?.trim().replace(/^\.?\//, '')
  if (value && category) {
    return [`/src/assets/recipes/${categoryToFolder(category)}/${value}`]
  }

  if (!category || !slug) return []

  const folder = categoryToFolder(category)
  return SUPPORTED_EXTENSIONS.map((ext) => `/src/assets/recipes/${folder}/${slug}.${ext}`)
}

export function resolveRecipePhoto(photo?: string, category?: string, slug?: string): ImageMetadata | null {
  for (const path of candidatePhotoPaths(photo, category, slug)) {
    const image = recipeImagesByPath.get(path)
    if (image) return image
  }
  return null
}
