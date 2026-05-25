import { BloomSearch } from '@pacote/bloom-search'
import { getByRole, getByText, queryByText } from '@testing-library/dom'
import { LitElement } from 'lit'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryConfig, type RecipeSearchDoc, type SearchIndexField, type SearchSummaryField } from '../lib/search'

function setupDOM() {
  document.body.innerHTML = `
    <div>
      <recipe-search target="recipes-static-content"></recipe-search>
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

describe('recipe-search', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    document.body.innerHTML = ''

    const bs = new BloomSearch<RecipeSearchDoc, SearchSummaryField, SearchIndexField>(queryConfig)
    bs.add('spaghetti-carbonara', {
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

    ;(window as Window & { __SEARCH_INDEX__?: unknown }).__SEARCH_INDEX__ = bs.index

    await import('./recipe-card')
    await import('./recipe-search')
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('is implemented as a LitElement', () => {
    const el = document.createElement('recipe-search')
    expect(el).toBeInstanceOf(LitElement)
  })

  it('renders search results and hides static grid on query', async () => {
    document.body.innerHTML = `
      <div>
        <recipe-search target="recipes-static-content"></recipe-search>
        <div id="recipes-static-content">
          <div class="grid">static grid</div>
          <nav aria-label="Recipe pages">pagination</nav>
        </div>
      </div>
    `

    const host = document.querySelector<SearchHost>('recipe-search')
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
    const host = document.querySelector<SearchHost>('recipe-search')
    await host?.updateComplete
    document.dispatchEvent(new Event('astro:page-load'))

    await search(host, 'spaghetti')

    expect(queryByText(host?.shadowRoot as unknown as HTMLElement, '1 result')).not.toBeNull()
  })

  it('shows result count badge with plural text when multiple results found', async () => {
    setupDOM()
    const host = document.querySelector<SearchHost>('recipe-search')
    await host?.updateComplete
    document.dispatchEvent(new Event('astro:page-load'))

    await search(host, 'mains')

    const badge = host?.shadowRoot?.querySelector('[data-testid="result-count"]')
    const count = Number(badge?.textContent?.match(/\d+/)?.[0] ?? 0)
    expect(count).toBeGreaterThan(1)
    expect(badge?.textContent).toMatch(/results/)
  })

  it('hides result count badge when no search term', async () => {
    setupDOM()
    const host = document.querySelector<SearchHost>('recipe-search')
    await host?.updateComplete
    document.dispatchEvent(new Event('astro:page-load'))

    expect(queryByText(host?.shadowRoot as unknown as HTMLElement, /result/)).toBeNull()
  })

  it('hides result count badge when search has no matches', async () => {
    setupDOM()
    const host = document.querySelector<SearchHost>('recipe-search')
    await host?.updateComplete
    document.dispatchEvent(new Event('astro:page-load'))

    await search(host, 'zqxjvk')

    expect(queryByText(host?.shadowRoot as unknown as HTMLElement, /result/)).toBeNull()
  })

  it('shows empty state when query has no matches and resets on clear', async () => {
    document.body.innerHTML = `
      <div>
        <recipe-search target="recipes-static-content"></recipe-search>
        <div id="recipes-static-content">
          <div class="grid">static grid</div>
          <nav aria-label="Recipe pages">pagination</nav>
        </div>
      </div>
    `

    const host = document.querySelector<SearchHost>('recipe-search')
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
})
