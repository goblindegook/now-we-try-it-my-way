import type { ImageMetadata } from 'astro'

const ingredientImageModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/ingredients/*.{avif,gif,jpeg,jpg,png,webp}',
  { eager: true },
)

const ingredientImagesByPath = new Map<string, ImageMetadata>()
for (const [path, mod] of Object.entries(ingredientImageModules)) {
  ingredientImagesByPath.set(path, mod.default)
}

const SUPPORTED_EXTENSIONS = ['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp']

export function candidateIngredientPhotoPaths(slug: string): string[] {
  return SUPPORTED_EXTENSIONS.map((ext) => `/src/assets/ingredients/${slug}.${ext}`)
}

export function resolveIngredientPhoto(slug: string): ImageMetadata | null {
  for (const path of candidateIngredientPhotoPaths(slug)) {
    const image = ingredientImagesByPath.get(path)
    if (image) return image
  }
  return null
}
