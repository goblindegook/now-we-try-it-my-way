import { BloomSearch } from '@pacote/bloom-search'
import { getByRole, getByText, queryByText } from '@testing-library/dom'
import { LitElement } from 'lit'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryConfig, type RecipeSearchDoc, type SearchIndexField, type SearchSummaryField } from '../lib/search'

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

    const staticContent = document.getElementById('recipes-static-content')
    expect(staticContent?.style.display).toBe('none')
    expect(getByText(document.body, '1 recipe')).not.toBeNull()
    expect(document.querySelector('recipe-card[slug="spaghetti-carbonara"]')).not.toBeNull()
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

    const staticContent = document.getElementById('recipes-static-content')
    expect(staticContent?.style.display).toBe('')
    expect(queryByText(document.body, 'Nothing found.')).toBeNull()
  })
})
