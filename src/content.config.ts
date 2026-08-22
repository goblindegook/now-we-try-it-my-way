import { defineCollection } from 'astro:content'
import type { Cookware, Ingredient, Timer } from '@tmlmt/cooklang-parser'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { recipesLoader } from './content/recipes-loader'
import type { RecipeSection, RecipeStep } from './lib/cooklang'
import { normalizeIngredientName } from './lib/ingredients'

const ingredients = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/ingredients' }),
  schema: z.object({
    name: z.string().transform(normalizeIngredientName),
    aliases: z.array(z.string().transform(normalizeIngredientName)).optional(),
    pairings: z.array(z.string()).optional(),
  }),
})

const recipes = defineCollection({
  loader: recipesLoader(),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    cuisine: z.string(),
    tags: z.array(z.string()),
    diet: z.array(z.string()),
    difficulty: z.string(),
    servings: z.number(),
    photo: z.string(),
    prepTime: z.string(),
    cookTime: z.string(),
    date: z.string(),
    ingredients: z.array(z.custom<Ingredient>()),
    timers: z.array(z.custom<Timer>()),
    sections: z.array(z.custom<RecipeSection>()),
    steps: z.array(z.custom<RecipeStep>()),
    cookware: z.array(z.custom<Cookware>()),
  }),
})

export const collections = { ingredients, recipes }
