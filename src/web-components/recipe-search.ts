import { BloomSearch, type Index } from '@pacote/bloom-search'
import { pluralize } from '../lib/pluralize'
import { queryConfig, type RecipeSearchDoc, type SearchIndexField, type SearchSummaryField } from '../lib/search'
import '../styles/recipe-card.css'
import './recipe-card'

declare global {
  interface Window {
    __SEARCH_INDEX__: Index<RecipeSearchDoc, SearchSummaryField> | undefined
  }
}

type SearchResult = Pick<RecipeSearchDoc, SearchSummaryField>

const STYLES = `
  .recipe-search-wrap {
    position: relative;
    padding: 3.5rem 0;
  }
  .recipe-search-input {
    display: block;
    width: 100%;
    padding: 0.75rem 3rem 0.75rem 1.25rem;
    font-size: clamp(1.375rem, 3vw, 1.875rem);
    font-family: var(--font-serif);
    font-style: normal;
    font-weight: 400;
    border: 1px solid var(--color-edge);
    border-radius: 22px;
    background: var(--color-surface);
    color: var(--color-ink);
    box-sizing: border-box;
    caret-color: var(--color-interactive);
    transition: border-color 0.15s, background 0.15s;
    -webkit-appearance: none;
    appearance: none;
  }
  .recipe-search-input::-webkit-search-cancel-button,
  .recipe-search-input::-webkit-search-decoration {
    -webkit-appearance: none;
  }
  .recipe-search-input::placeholder {
    color: var(--color-disabled);
    font-style: normal;
  }
  .recipe-search-input:hover{
    border-color: var(--color-interactive);
  }
  .recipe-search-input:focus {
    outline: none;
    border-color: var(--color-interactive);
    background: var(--color-tint);
  }
  .recipe-search-icon {
    position: absolute;
    right: 0.875rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.375rem;
    height: 1.375rem;
    color: var(--color-interactive);
    pointer-events: none;
    transition: color 0.15s;
  }
  .recipe-search-wrap:focus-within .recipe-search-icon {
    color: var(--color-interactive);
  }
  .recipe-search-count {
    font-size: 0.8125rem;
    color: var(--color-subtle);
    margin: 0 0 1.75rem;
    font-weight: 400;
  }
  .recipe-search-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.75rem;
  }

  .recipe-search-empty {
    color: var(--color-subtle);
    font-size: 0.8125rem;
    font-weight: 400;
    padding: 3rem 0;
    text-align: center;
  }
  .recipe-search-empty__heading {
    font-size: 0.8125rem;
    color: var(--color-subtle);
    margin: 0;
  }
`

const SEARCH_ICON = `<svg class="recipe-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderCard(result: SearchResult): string {
  const attrs = [
    `slug="${escapeHtml(result.slug)}"`,
    `title="${escapeHtml(result.title)}"`,
    `category="${escapeHtml(result.category)}"`,
    `cuisine="${escapeHtml(result.cuisine)}"`,
    `prep-time="${escapeHtml(result.prepTime)}"`,
    `cook-time="${escapeHtml(result.cookTime)}"`,
    result.photoSrc ? `photo-src="${escapeHtml(result.photoSrc)}"` : '',
  ]
    .filter(Boolean)
    .join(' ')
  return `<recipe-card ${attrs}></recipe-card>`
}

class RecipeSearch extends HTMLElement {
  private bs: BloomSearch<RecipeSearchDoc, SearchSummaryField, SearchIndexField> | null = null
  private staticGrid: HTMLElement | null = null
  private staticPagination: HTMLElement | null = null
  private resultsContainer: HTMLElement | null = null

  connectedCallback() {
    this.injectStyles()
    this.buildDOM()
    // Defer index init until astro:page-load so the inline script that sets
    // window.__SEARCH_INDEX__ has already run (View Transitions swaps DOM first,
    // then runs page scripts, so connectedCallback fires too early).
    document.addEventListener(
      'astro:page-load',
      () => {
        this.initIndex()
        this.attachListener()
      },
      { once: true },
    )
  }

  private injectStyles() {
    if (document.getElementById('recipe-search-styles')) return
    const style = document.createElement('style')
    style.id = 'recipe-search-styles'
    style.textContent = STYLES
    document.head.appendChild(style)
  }

  private initIndex() {
    try {
      const index = window.__SEARCH_INDEX__
      if (!index) return
      this.bs = new BloomSearch(queryConfig)
      this.bs.load(index)
    } catch {
      this.bs = null
    }
  }

  private buildDOM() {
    const targetId = this.getAttribute('target')
    this.staticGrid = targetId ? document.getElementById(targetId) : null
    this.staticPagination =
      this.staticGrid?.parentElement?.querySelector<HTMLElement>('[data-static-pagination]') ?? null

    this.resultsContainer = document.createElement('div')
    this.resultsContainer.hidden = true
    this.staticGrid?.insertAdjacentElement('beforebegin', this.resultsContainer)

    this.innerHTML = `<div class="recipe-search-wrap">
      ${SEARCH_ICON}
      <input
        type="search"
        class="recipe-search-input"
        placeholder="Search by ingredient, dish, cuisine or diet…"
        aria-label="Search recipes"
      />
    </div>`
  }

  private attachListener() {
    if (!this.bs) return
    const input = this.querySelector<HTMLInputElement>('input')
    if (!input) return
    let timer: ReturnType<typeof setTimeout>
    input.addEventListener('input', () => {
      clearTimeout(timer)
      timer = setTimeout(() => this.handleQuery(input.value.trim()), 200)
    })
  }

  private handleQuery(query: string) {
    if (!query) {
      this.showStatic()
      return
    }
    const results = this.bs?.search(query) ?? []
    if (results.length === 0) {
      this.showEmpty()
    } else {
      this.showResults(results)
    }
  }

  private showStatic() {
    if (this.staticGrid) this.staticGrid.style.display = ''
    if (this.staticPagination) this.staticPagination.style.display = ''
    if (this.resultsContainer) {
      this.resultsContainer.hidden = true
      this.resultsContainer.innerHTML = ''
    }
  }

  private showEmpty() {
    if (this.staticGrid) this.staticGrid.style.display = 'none'
    if (this.staticPagination) this.staticPagination.style.display = 'none'
    if (this.resultsContainer) {
      this.resultsContainer.hidden = false
      this.resultsContainer.innerHTML =
        '<div class="recipe-search-empty"><p class="recipe-search-empty__heading">Nothing found.</p></div>'
    }
  }

  private showResults(results: SearchResult[]) {
    if (this.staticGrid) this.staticGrid.style.display = 'none'
    if (this.staticPagination) this.staticPagination.style.display = 'none'
    if (this.resultsContainer) {
      this.resultsContainer.hidden = false
      const count = results.length
      this.resultsContainer.innerHTML = `
        <div class="recipe-search-count">${pluralize(count, 'recipe')}</div>
        <div class="recipe-search-results-grid">${results.map((r) => renderCard(r)).join('')}</div>`
    }
  }
}

customElements.define('recipe-search', RecipeSearch)
