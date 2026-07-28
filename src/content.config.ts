import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { normalizeIngredientName } from './lib/ingredients'

const ingredients = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/ingredients' }),
  schema: z.object({
    name: z.string().transform(normalizeIngredientName),
    aliases: z.array(z.string().transform(normalizeIngredientName)).optional(),
    pairings: z.array(z.string()).optional(),
  }),
})

export const collections = { ingredients }
