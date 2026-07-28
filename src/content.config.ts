import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const ingredients = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/ingredients' }),
  schema: z.object({
    name: z.string(),
    aliases: z.array(z.string()).optional(),
    pairings: z.array(z.string()).optional(),
  }),
})

export const collections = { ingredients }
