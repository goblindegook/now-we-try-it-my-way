import { describe, expect, it } from 'vitest'
import { type ParsedRecipe, parseRecipe } from './cooklang'
import { buildRecipeRssItems } from './rss'

function recipe(overrides: Partial<ParsedRecipe>): ParsedRecipe {
  return {
    slug: 'sample-recipe',
    title: 'Sample Recipe',
    description: 'Sample description',
    category: 'Mains',
    cuisine: '',
    tags: [],
    diet: [],
    difficulty: '',
    servings: 4,
    photo: '',
    prepTime: '',
    cookTime: '',
    date: '',
    ingredients: [],
    timers: [],
    sections: [],
    steps: [],
    cookware: [],
    ...overrides,
  }
}

function withFrontmatter(meta: string, body: string): string {
  return `---\n${meta}\n---\n\n${body}`
}

describe('buildRecipeRssItems', () => {
  it('orders feed items by newest recipe date first', () => {
    const site = new URL('https://nowwetry.it')
    const items = buildRecipeRssItems(
      [
        recipe({ slug: 'older', title: 'Older', date: '2026-05-10' }),
        recipe({ slug: 'newer', title: 'Newer', date: '2026-05-20' }),
      ],
      site,
    )

    expect(items.map((item) => item.title)).toEqual(['Newer', 'Older'])
    expect(items.map((item) => item.link)).toEqual([
      'https://nowwetry.it/recipes/newer',
      'https://nowwetry.it/recipes/older',
    ])
  })

  it('uses fallback publication date when recipe date is missing or invalid', () => {
    const site = new URL('https://nowwetry.it')
    const items = buildRecipeRssItems(
      [
        recipe({ slug: 'missing-date', title: 'Missing Date', date: '' }),
        recipe({ slug: 'invalid-date', title: 'Invalid Date', date: 'not-a-date' }),
      ],
      site,
    )

    expect(items[0].pubDate?.toISOString()).toBe('1970-01-01T00:00:00.000Z')
    expect(items[1].pubDate?.toISOString()).toBe('1970-01-01T00:00:00.000Z')
  })

  it('provides description fallback when recipe description is missing', () => {
    const site = new URL('https://nowwetry.it')
    const items = buildRecipeRssItems([recipe({ title: 'Focaccia', description: '' })], site)

    expect(items[0].description).toBe('Focaccia')
  })

  it('includes full recipe body content in each feed item', () => {
    const parsed = parseRecipe(
      withFrontmatter(
        'title: Bread\ndescription: Crusty loaf\ncreated: 2026-05-21',
        'Mix @flour{200%g} with @water{300%ml}.\n\nRest for ~{30%minutes}.',
      ),
      'bread',
    )
    const items = buildRecipeRssItems([parsed], new URL('https://nowwetry.it'))

    expect(items[0].content).toContain('Mix 200 g flour with 300 ml water.')
    expect(items[0].content).toContain('Rest for 30 minutes.')
  })

  it('includes image metadata in feed item custom data when recipe has photo', () => {
    const items = buildRecipeRssItems(
      [recipe({ photo: '/src/assets/recipes/mains/spaghetti-carbonara.jpeg' })],
      new URL('https://nowwetry.it'),
    )

    expect(items[0].customData).toContain('<media:content')
    expect(items[0].customData).toContain('url="https://nowwetry.it/')
    expect(items[0].content).not.toContain('<img')
  })

  it('uses display names from instruction items when available', () => {
    const parsed = parseRecipe(
      withFrontmatter(
        'title: Syrup\ndescription: Sweet\ncreated: 2026-05-21',
        'Stir in @granulated sugar|brown sugar{1%tbsp}.',
      ),
      'syrup',
    )
    const items = buildRecipeRssItems([parsed], new URL('https://nowwetry.it'))

    expect(items[0].content).toContain('Stir in 1 tbsp brown sugar.')
    expect(items[0].content).not.toContain('Stir in granulated sugar.')
  })

  it('adds recipe tags and category as RSS categories', () => {
    const site = new URL('https://nowwetry.it')
    const items = buildRecipeRssItems(
      [
        recipe({
          date: '2026-05-21',
          category: 'Mains',
          tags: ['Pasta', 'weeknight', 'Pasta'],
        }),
      ],
      site,
    )

    expect(items[0].categories).toEqual(['mains', 'pasta', 'weeknight'])
  })

  it('renders shorthand ingredient preparation in rss content', () => {
    const parsed = parseRecipe(
      withFrontmatter(
        'title: Onion Paste\ndescription: Aromatic base\ncreated: 2026-05-21',
        'Mix @onion{1}(peeled and finely chopped) into paste.',
      ),
      'onion-paste',
    )
    const items = buildRecipeRssItems([parsed], new URL('https://nowwetry.it'))

    expect(items[0].content).toContain('1 onion (peeled and finely chopped)')
  })
})
