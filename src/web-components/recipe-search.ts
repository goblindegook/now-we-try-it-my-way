import { BloomSearch, type Index } from '@pacote/bloom-search'
import { css, html, LitElement, type PropertyValues } from 'lit'
import { pluralize } from '../lib/pluralize'
import { queryConfig, type RecipeSearchDoc, type SearchIndexField, type SearchSummaryField } from '../lib/search'
import '../styles/recipe-search-results.css'
import './recipe-card'

declare global {
  interface Window {
    __SEARCH_INDEX__: Index<RecipeSearchDoc, SearchSummaryField> | undefined
  }
}

type SearchResult = Pick<RecipeSearchDoc, SearchSummaryField>
type SearchMode = 'static' | 'results' | 'empty'

class RecipeSearch extends LitElement {
  static styles = css`
    .recipe-search-wrap {
      position: relative;
      padding: 1rem 0 4rem;
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
    .recipe-search-input:hover {
      border-color: var(--color-interactive);
    }
    .recipe-search-input:focus {
      outline: none;
      border-color: var(--color-interactive);
      background: var(--color-tint);
    }
    .recipe-search-icon {
      position: absolute;
      right: 1rem;
      top: 33%;
      transform: translateY(-33%);
      width: 1.375rem;
      height: 1.375rem;
      color: var(--color-interactive);
      pointer-events: none;
      transition: color 0.15s;
    }
    .recipe-search-wrap:focus-within .recipe-search-icon {
      color: var(--color-interactive);
    }
  `

  static properties = {
    mode: { state: true },
    results: { state: true },
  }

  private bs: BloomSearch<RecipeSearchDoc, SearchSummaryField, SearchIndexField> | null = null
  private mode: SearchMode = 'static'
  private results: SearchResult[] = []
  private staticContent: HTMLElement | null = null
  private resultsContent: HTMLElement | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  connectedCallback() {
    super.connectedCallback()
    this.resolveStaticTargets()
    this.initIndex()
    document.addEventListener('astro:page-load', this.onAstroPageLoad)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    document.removeEventListener('astro:page-load', this.onAstroPageLoad)
  }

  protected override updated(changed: PropertyValues<this>) {
    if (changed.has('mode') || changed.has('results')) {
      this.syncStaticVisibility()
      this.syncResultsContent()
    }
  }

  private onAstroPageLoad = () => {
    this.resolveStaticTargets()
    this.initIndex()
  }

  private resolveStaticTargets() {
    const targetId = this.getAttribute('target')
    this.staticContent = targetId ? document.getElementById(targetId) : null
    this.resultsContent = this.resolveResultsTarget(targetId)
  }

  private resolveResultsTarget(targetId: string | null) {
    if (!targetId) return null
    const resultsId = `${targetId}-search-results`
    const existing = document.getElementById(resultsId)
    if (existing) return existing
    if (!this.staticContent?.parentElement) return null

    const section = document.createElement('section')
    section.id = resultsId
    section.setAttribute('aria-live', 'polite')
    section.style.display = 'none'
    this.staticContent.insertAdjacentElement('afterend', section)
    return section
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

  private onInput = (event: Event) => {
    if (!this.bs) return
    const input = event.currentTarget as HTMLInputElement
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => this.handleQuery(input.value.trim()), 200)
  }

  private handleQuery(query: string) {
    if (!query) {
      this.mode = 'static'
      this.results = []
      return
    }

    const found = this.bs?.search(query) ?? []
    if (found.length === 0) {
      this.mode = 'empty'
      this.results = []
      return
    }

    this.mode = 'results'
    this.results = found
  }

  private syncStaticVisibility() {
    const staticDisplay = this.mode === 'static' ? '' : 'none'
    if (this.staticContent) this.staticContent.style.display = staticDisplay
  }

  private syncResultsContent() {
    if (!this.resultsContent) return

    if (this.mode === 'static') {
      this.resultsContent.style.display = 'none'
      this.resultsContent.replaceChildren()
      return
    }

    this.resultsContent.style.display = ''
    this.resultsContent.replaceChildren()

    if (this.mode === 'results') {
      const count = document.createElement('div')
      count.className = 'recipe-search-count'
      count.textContent = pluralize(this.results.length, 'recipe')
      this.resultsContent.append(count)

      const grid = document.createElement('div')
      grid.className = 'recipe-search-results-grid'
      for (const result of this.results) {
        const card = document.createElement('recipe-card')
        card.setAttribute('slug', result.slug)
        card.setAttribute('title', result.title)
        card.setAttribute('category', result.category)
        card.setAttribute('cuisine', result.cuisine)
        card.setAttribute('prep-time', result.prepTime ?? '')
        card.setAttribute('cook-time', result.cookTime ?? '')
        card.setAttribute('photo-src', result.photoSrc ?? '')
        grid.append(card)
      }
      this.resultsContent.append(grid)
      return
    }

    const empty = document.createElement('div')
    empty.className = 'recipe-search-empty'
    const heading = document.createElement('p')
    heading.className = 'recipe-search-empty__heading'
    heading.textContent = 'Nothing found.'
    empty.append(heading)
    this.resultsContent.append(empty)
  }

  render() {
    return html`
      <div class="recipe-search-wrap">
        <svg
          class="recipe-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="search"
          class="recipe-search-input"
          placeholder="Search by ingredient, dish, cuisine or diet"
          aria-label="Search recipes"
          @input=${this.onInput}
        />
      </div>
    `
  }
}

if (!customElements.get('recipe-search')) customElements.define('recipe-search', RecipeSearch)
