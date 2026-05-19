import { BloomSearch, type Index } from '@pacote/bloom-search'
import { cuisineToFlag } from '../lib/cuisine'
import { pluralize } from '../lib/pluralize'
import { queryConfig, type RecipeSearchDoc, type SearchIndexField, type SearchSummaryField } from '../lib/search'

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

  .recipe-search-card {
    display: block;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--color-edge);
    transition: box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.15s ease;
    background: var(--color-surface);
  }
  .recipe-search-card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    border-color: var(--color-interactive);
  }
  @media (prefers-reduced-motion: reduce) {
    .recipe-search-card { transition: box-shadow 0.15s ease-out, transform 0.15s ease-out; }
  }

  .recipe-search-card__image-wrap {
    aspect-ratio: 4/3;
    overflow: hidden;
    background-color: var(--color-void);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M0 16L16 0M0 0L16 16' stroke='%232e2a26' stroke-width='0.75' fill='none'/%3E%3C/svg%3E");
    background-size: 16px 16px;
  }
  .recipe-search-card__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s;
  }
  .recipe-search-card:hover .recipe-search-card__image {
    transform: scale(1.03);
  }
  .recipe-search-card__placeholder {
    width: 100%;
    height: 100%;
  }
  .recipe-search-card__body {
    padding: 1rem 1.25rem 1.25rem;
  }
  .recipe-search-card__top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 0 0 0.4rem;
  }
  .recipe-search-card__category {
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-interactive);
    margin: 0;
  }
  .recipe-search-card__flag {
    font-size: 1.1rem;
    line-height: 1;
  }
  .recipe-search-card__title {
    font-family: var(--font-serif);
    font-size: 1.5rem;
    margin: 0 0 0.5rem;
    line-height: 1.25;
    color: var(--color-ink);
  }
  .recipe-search-card__meta {
    display: flex;
    gap: 0;
    font-size: 0.75rem;
    color: var(--color-subtle);
  }
  .recipe-search-card__meta span + span::before {
    content: '·';
    margin: 0 0.5rem;
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

function renderCard(result: SearchResult, index: number): string {
  const href = `/recipes/${result.slug}`
  const img = result.photoSrc
    ? `<img src="${escapeHtml(result.photoSrc)}" alt="${escapeHtml(result.title)}" class="recipe-search-card__image" loading="lazy" />`
    : `<div class="recipe-search-card__placeholder" aria-hidden="true"></div>`
  const flag = cuisineToFlag(result.cuisine ?? '')
  const meta = [
    result.prepTime ? `<span>Prep: ${escapeHtml(result.prepTime)}</span>` : '',
    result.cookTime ? `<span>Cook: ${escapeHtml(result.cookTime)}</span>` : '',
  ]
    .filter(Boolean)
    .join('')
  return `<a href="${escapeHtml(href)}" class="recipe-search-card" style="animation-delay:${index * 50}ms">
    <div class="recipe-search-card__image-wrap">${img}</div>
    <div class="recipe-search-card__body">
      <div class="recipe-search-card__top">
        <p class="recipe-search-card__category">${escapeHtml(result.category)}</p>
        ${flag ? `<span class="recipe-search-card__flag">${flag}</span>` : ''}
      </div>
      <h2 class="recipe-search-card__title">${escapeHtml(result.title)}</h2>
      ${meta ? `<div class="recipe-search-card__meta">${meta}</div>` : ''}
    </div>
  </a>`
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
        <div class="recipe-search-results-grid">${results.map((r, i) => renderCard(r, i)).join('')}</div>`
    }
  }
}

customElements.define('recipe-search', RecipeSearch)
