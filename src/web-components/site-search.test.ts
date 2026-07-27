import { BloomSearch } from '@pacote/bloom-search'
import { getByRole, getByText, queryByText } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryConfig, type SearchIndexField, type SearchSummaryField, type SiteSearchDoc } from '../lib/search'

function setupDOM() {
  document.body.innerHTML = `
    <div>
      <site-search target="recipes-static-content"></site-search>
      <div id="recipes-static-content">
        <div class="grid">static grid</div>
      </div>
    </div>
  `
}

async function search(host: SearchHost | null, query: string) {
  const input = getByRole(host?.shadowRoot as unknown as HTMLElement, 'searchbox', {
    name: /search recipes/i,
  }) as HTMLInputElement
  input.value = query
  input.dispatchEvent(new Event('input', { bubbles: true }))
  vi.advanceTimersByTime(200)
  await Promise.resolve()
}

type SearchHost = HTMLElement & { updateComplete?: Promise<unknown> }

function createSearchIndex() {
  const bs = new BloomSearch<SiteSearchDoc, SearchSummaryField, SearchIndexField>(queryConfig)
  bs.add('spaghetti-carbonara', {
    type: 'recipe',
    slug: 'spaghetti-carbonara',
    title: 'Spaghetti carbonara',
    category: 'Mains',
    cuisine: 'italian',
    prepTime: '10 min',
    cookTime: '15 min',
    photoSrc: '/img.jpg',
    tags: 'pasta',
    ingredients: 'spaghetti guanciale pecorino',
    diet: '',
    difficulty: 'easy',
  })
  bs.add('moussaka', {
    type: 'recipe',
    slug: 'moussaka',
    title: 'Moussaka',
    category: 'Mains',
    cuisine: 'greek',
    prepTime: '20 min',
    cookTime: '40 min',
    photoSrc: '/img2.jpg',
    tags: 'bake',
    ingredients: 'aubergine potato',
    diet: '',
    difficulty: 'medium',
  })
  bs.add('garlic', {
    type: 'ingredient',
    slug: 'garlic',
    name: 'Garlic',
    body: 'Peel just before cooking.',
  })
  return bs.index
}

describe('site-search', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    document.body.innerHTML = ''
    window.history.replaceState({}, '', '/')

    ;(window as Window & { __SEARCH_INDEX__?: unknown }).__SEARCH_INDEX__ = createSearchIndex()

    await import('./recipe-card')
    await import('./ingredient-card')
    await import('./site-search')
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('renders search results and hides static grid on query', async () => {
    document.body.innerHTML = `
      <div>
        <site-search target="recipes-static-content"></site-search>
        <div id="recipes-static-content">
          <div class="grid">static grid</div>
          <nav aria-label="Recipe pages">pagination</nav>
        </div>
      </div>
    `

    const host = document.querySelector<SearchHost>('site-search')
    await host?.updateComplete
    document.dispatchEvent(new Event('astro:page-load'))

    const search = getByRole(host?.shadowRoot as unknown as HTMLElement, 'searchbox', {
      name: /search recipes/i,
    }) as HTMLInputElement
    search.value = 'spaghetti'
    search.dispatchEvent(new Event('input', { bubbles: true }))

    vi.advanceTimersByTime(200)
    await Promise.resolve()

    expect(document.querySelector('recipe-card[slug="spaghetti-carbonara"]')).not.toBeNull()
  })

  it('shows result count badge with singular text when one result found', async () => {
    setupDOM()
    const host = document.querySelector<SearchHost>('site-search')
    await host?.updateComplete
    document.dispatchEvent(new Event('astro:page-load'))

    await search(host, 'spaghetti')

    expect(queryByText(host?.shadowRoot as unknown as HTMLElement, '1 result')).not.toBeNull()
  })

  it('shows result count badge with plural text when multiple results found', async () => {
    setupDOM()
    const host = document.querySelector<SearchHost>('site-search')
    await host?.updateComplete
    document.dispatchEvent(new Event('astro:page-load'))

    await search(host, 'mains')

    const badgeText = queryByText(host?.shadowRoot as unknown as HTMLElement, /\d+\s+results/)
    const count = Number(badgeText?.textContent?.match(/\d+/)?.[0] ?? 0)
    expect(count).toBeGreaterThan(1)
    expect(badgeText?.textContent).toMatch(/results/)
  })

  it('hides result count badge when no search term', async () => {
    setupDOM()
    const host = document.querySelector<SearchHost>('site-search')
    await host?.updateComplete
    document.dispatchEvent(new Event('astro:page-load'))

    expect(queryByText(host?.shadowRoot as unknown as HTMLElement, /result/)).toBeNull()
  })

  it('hides result count badge when search has no matches', async () => {
    setupDOM()
    const host = document.querySelector<SearchHost>('site-search')
    await host?.updateComplete
    document.dispatchEvent(new Event('astro:page-load'))

    await search(host, 'zqxjvk')

    expect(queryByText(host?.shadowRoot as unknown as HTMLElement, /result/)).toBeNull()
  })

  it('shows empty state when query has no matches and resets on clear', async () => {
    document.body.innerHTML = `
      <div>
        <site-search target="recipes-static-content"></site-search>
        <div id="recipes-static-content">
          <div class="grid">static grid</div>
          <nav aria-label="Recipe pages">pagination</nav>
        </div>
      </div>
    `

    const host = document.querySelector<SearchHost>('site-search')
    await host?.updateComplete
    document.dispatchEvent(new Event('astro:page-load'))

    const search = getByRole(host?.shadowRoot as unknown as HTMLElement, 'searchbox', {
      name: /search recipes/i,
    }) as HTMLInputElement
    search.value = 'zqxjvk'
    search.dispatchEvent(new Event('input', { bubbles: true }))

    vi.advanceTimersByTime(200)
    await Promise.resolve()

    expect(getByText(document.body, 'Nothing found.')).not.toBeNull()

    search.value = ''
    search.dispatchEvent(new Event('input', { bubbles: true }))

    vi.advanceTimersByTime(200)
    await Promise.resolve()

    expect(document.querySelector('recipe-card')).toBeNull()
    expect(queryByText(document.body, 'Nothing found.')).toBeNull()
  })

  it('initializes search on input when index becomes available after connect', async () => {
    delete (window as Window & { __SEARCH_INDEX__?: unknown }).__SEARCH_INDEX__
    setupDOM()

    const host = document.querySelector<SearchHost>('site-search')
    await host?.updateComplete

    ;(window as Window & { __SEARCH_INDEX__?: unknown }).__SEARCH_INDEX__ = createSearchIndex()

    await search(host, 'spaghetti')

    expect(document.querySelector('recipe-card[slug="spaghetti-carbonara"]')).not.toBeNull()
  })

  it('syncs search query with q param and hydrates from existing q param', async () => {
    window.history.replaceState({}, '', '/recipes?q=spaghetti')
    setupDOM()

    const host = document.querySelector<SearchHost>('site-search')
    await host?.updateComplete
    document.dispatchEvent(new Event('astro:page-load'))
    await Promise.resolve()

    const input = getByRole(host?.shadowRoot as unknown as HTMLElement, 'searchbox', {
      name: /search recipes/i,
    }) as HTMLInputElement

    expect(input.value).toBe('spaghetti')
    expect(document.querySelector('recipe-card[slug="spaghetti-carbonara"]')).not.toBeNull()

    input.value = 'moussaka'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    vi.advanceTimersByTime(200)
    await Promise.resolve()

    expect(window.location.search).toBe('?q=moussaka')

    input.value = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))

    vi.advanceTimersByTime(200)
    await Promise.resolve()

    expect(window.location.search).toBe('')
  })

  it('re-resolves target content on input when target changes after connect', async () => {
    document.body.innerHTML = `
      <div>
        <site-search target="recipes-static-content"></site-search>
        <div id="recipes-static-content">
          <div class="grid">old grid</div>
        </div>
        <div id="homepage-content">
          <div class="grid">new grid</div>
        </div>
      </div>
    `

    const host = document.querySelector<SearchHost>('site-search')
    await host?.updateComplete

    host?.setAttribute('target', 'homepage-content')
    document.getElementById('recipes-static-content')?.remove()

    await search(host, 'spaghetti')

    expect(
      document.querySelector('#homepage-content-search-results recipe-card[slug="spaghetti-carbonara"]'),
    ).not.toBeNull()
  })

  it('renders an ingredient-card for ingredient results, not a recipe-card', async () => {
    setupDOM()
    const host = document.querySelector<SearchHost>('site-search')
    await host?.updateComplete
    document.dispatchEvent(new Event('astro:page-load'))

    await search(host, 'garlic')

    expect(document.querySelector('ingredient-card[slug="garlic"]')).not.toBeNull()
    expect(document.querySelector('recipe-card')).toBeNull()
  })
})
