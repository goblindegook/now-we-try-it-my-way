import { BloomSearch, type Index } from '@pacote/bloom-search'
import { queryConfig, type RecipeSearchDoc, type SearchIndexField, type SearchSummaryField } from '../lib/search'

declare global {
  interface Window {
    __SEARCH_INDEX__: Index<RecipeSearchDoc, SearchSummaryField> | undefined
  }
}

type SearchResult = Pick<RecipeSearchDoc, SearchSummaryField>

const STYLES = `
  .recipe-search-input {
    display: block;
    width: 100%;
    padding: 0.625rem 0.875rem;
    font-size: 1rem;
    font-family: inherit;
    border: 1px solid var(--color-border, #d4ccc4);
    border-radius: 4px;
    background: var(--color-surface, #fff);
    color: var(--color-text, #1a1714);
    margin-bottom: 1.75rem;
    box-sizing: border-box;
  }
  .recipe-search-input:focus {
    outline: 2px solid var(--color-accent, #8b5e3c);
    outline-offset: 2px;
    border-color: var(--color-accent, #8b5e3c);
  }
  .recipe-search-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.75rem;
  }
  .recipe-search-empty {
    padding: 4rem 0 2rem;
  }
  .recipe-search-empty__heading {
    font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
    font-size: 1.75rem;
    font-weight: 400;
    font-style: italic;
    color: var(--color-text, #1a1714);
    margin: 0 0 0.625rem;
    line-height: 1.2;
  }
  .recipe-search-empty__sub {
    font-size: 0.875rem;
    color: var(--color-muted, #8a7f78);
    margin: 0;
  }
  .recipe-search-card {
    display: block;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--color-border, #d4ccc4);
    transition: box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    background: var(--color-surface, #fff);
    text-decoration: none;
    color: inherit;
  }
  .recipe-search-card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    transform: translateY(-3px);
  }
  @media (prefers-reduced-motion: reduce) {
    .recipe-search-card {
      transition: box-shadow 0.15s ease-out, transform 0.15s ease-out;
    }
  }
  .recipe-search-card__image-wrap {
    aspect-ratio: 4/3;
    overflow: hidden;
    background-color: #1e1a17;
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
  .recipe-search-card__category {
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-accent, #8b5e3c);
    margin: 0 0 0.4rem;
  }
  .recipe-search-card__title {
    font-family: var(--font-serif, Georgia, serif);
    font-size: 1.5rem;
    margin: 0 0 0.5rem;
    line-height: 1.25;
    color: var(--color-text, #1a1714);
  }
  .recipe-search-card__meta {
    display: flex;
    gap: 0;
    font-size: 0.75rem;
    color: var(--color-muted, #8a7f78);
  }
  .recipe-search-card__meta span + span::before {
    content: '·';
    margin: 0 0.5rem;
  }
`

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderCard(result: SearchResult): string {
  const href = `/recipes/${result.slug}`
  const img = result.photoSrc
    ? `<img src="${escapeHtml(result.photoSrc)}" alt="${escapeHtml(result.title)}" class="recipe-search-card__image" loading="lazy" />`
    : `<div class="recipe-search-card__placeholder" aria-hidden="true"></div>`
  const meta = [
    result.prepTime ? `<span>Prep: ${escapeHtml(result.prepTime)}</span>` : '',
    result.cookTime ? `<span>Cook: ${escapeHtml(result.cookTime)}</span>` : '',
  ]
    .filter(Boolean)
    .join('')
  return `<a href="${escapeHtml(href)}" class="recipe-search-card">
    <div class="recipe-search-card__image-wrap">${img}</div>
    <div class="recipe-search-card__body">
      <p class="recipe-search-card__category">${escapeHtml(result.category)}</p>
      <h2 class="recipe-search-card__title">${escapeHtml(result.title)}</h2>
      ${meta ? `<div class="recipe-search-card__meta">${meta}</div>` : ''}
    </div>
  </a>`
}

class RecipeSearch extends HTMLElement {
  private bs: BloomSearch<RecipeSearchDoc, SearchSummaryField, SearchIndexField> | null = null
  private staticGrid: HTMLElement | null = null
  private resultsContainer: HTMLElement | null = null

  connectedCallback() {
    this.injectStyles()
    this.initIndex()
    this.buildDOM()
    this.attachListener()
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

    this.resultsContainer = document.createElement('div')
    this.resultsContainer.hidden = true
    this.staticGrid?.insertAdjacentElement('beforebegin', this.resultsContainer)

    this.innerHTML = `<input
      type="search"
      class="recipe-search-input"
      placeholder="Search recipes…"
      aria-label="Search recipes"
    />`
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
    if (this.resultsContainer) {
      this.resultsContainer.hidden = true
      this.resultsContainer.innerHTML = ''
    }
  }

  private showEmpty() {
    if (this.staticGrid) this.staticGrid.style.display = 'none'
    if (this.resultsContainer) {
      this.resultsContainer.hidden = false
      this.resultsContainer.innerHTML =
        '<div class="recipe-search-empty"><p class="recipe-search-empty__heading">Nothing matched.</p><p class="recipe-search-empty__sub">Try an ingredient, dish name, or tag.</p></div>'
    }
  }

  private showResults(results: SearchResult[]) {
    if (this.staticGrid) this.staticGrid.style.display = 'none'
    if (this.resultsContainer) {
      this.resultsContainer.hidden = false
      this.resultsContainer.innerHTML = `<div class="recipe-search-results-grid">${results.map(renderCard).join('')}</div>`
    }
  }
}

customElements.define('recipe-search', RecipeSearch)
