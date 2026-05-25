import rss from '@astrojs/rss'
import type { APIRoute } from 'astro'
import { loadAllRecipes } from '../lib/cooklang'
import { buildRecipeRssItems } from '../lib/rss'

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('RSS feed unavailable: missing site URL configuration.', { status: 500 })
  }

  const recipes = await loadAllRecipes()
  return rss({
    title: 'Now We Try It My Way Recipes',
    description: 'Latest recipes from Now We Try It My Way.',
    site,
    xmlns: {
      media: 'http://search.yahoo.com/mrss/',
    },
    items: buildRecipeRssItems(recipes, site),
  })
}
