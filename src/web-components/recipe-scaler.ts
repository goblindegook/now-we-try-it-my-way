import type { FixedValue, Ingredient, Range } from '@tmlmt/cooklang-parser'
import { css, html, LitElement } from 'lit'

type QuantityValue =
  | { type: 'text'; value: string }
  | { type: 'decimal'; value: number }
  | { type: 'fraction'; num: number; den: number }

function quantityValueToNumeric(value: QuantityValue): number {
  if (value.type === 'decimal') return value.value
  if (value.type === 'fraction') return value.den === 0 ? 0 : value.num / value.den
  const numeric = Number.parseFloat(value.value)
  return Number.isFinite(numeric) ? numeric : 0
}

function quantityToNumeric(quantity?: FixedValue | Range): number {
  if (!quantity) return 0
  if (quantity.type === 'fixed') return quantityValueToNumeric(quantity.value)
  return quantity.min.type === 'decimal'
    ? quantity.min.value
    : quantity.min.den === 0
      ? 0
      : quantity.min.num / quantity.min.den
}

export class RecipeScaler extends LitElement {
  static properties = {
    servings: { type: Number },
    ingredients: { type: String },
    current: { state: true },
  }

  servings = 4
  ingredients = '[]'
  current = 0

  connectedCallback() {
    super.connectedCallback()
    this.current = this.servings
  }

  static styles = css`
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, sans-serif);
    }
    .scaler {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .scaler__label {
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-muted, #7a746e);
    }
    .scaler__btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid var(--color-border, #e5dfd6);
      background: #fff;
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text, #1c1c1c);
      transition: background 0.15s, transform 0.08s ease;
    }
    .scaler__btn:hover { background: var(--color-border, #e5dfd6); }
    .scaler__btn:active:not(:disabled) { transform: scale(0.88); }
    .scaler__btn:disabled { opacity: 0.3; cursor: default; }
    @media (prefers-reduced-motion: reduce) {
      .scaler__btn:active { transform: none; }
    }
    .scaler__count {
      font-family: var(--font-serif, Georgia, serif);
      font-size: 1.25rem;
      min-width: 2ch;
      text-align: center;
    }
    .ingredients { list-style: none; margin: 0; padding: 0; }
    .ingredients li {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-border, #e5dfd6);
      font-size: 0.9375rem;
    }
    .ingredients li:last-child { border-bottom: none; }
    .ingredient__name { flex: 1; }
    .ingredient__amount {
      font-weight: 500;
      white-space: nowrap;
      color: var(--color-accent, #b85c38);
    }
  `

  private scale(qty: number): string {
    const factor = this.current / this.servings
    const scaled = qty * factor
    if (scaled === Math.floor(scaled)) return String(scaled)
    const fractions: [number, string][] = [
      [0.25, '¼'],
      [0.5, '½'],
      [0.75, '¾'],
      [0.33, '⅓'],
      [0.67, '⅔'],
    ]
    const whole = Math.floor(scaled)
    const frac = scaled - whole
    const match = fractions.find(([v]) => Math.abs(v - frac) < 0.05)
    if (match) return (whole > 0 ? `${whole} ` : '') + match[1]
    return scaled.toFixed(1).replace(/\.0$/, '')
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('current') && changed.get('current') !== undefined) {
      this.dispatchEvent(
        new CustomEvent('servings-change', {
          bubbles: true,
          detail: { current: this.current, base: this.servings },
        }),
      )
    }
  }

  render() {
    const items: Ingredient[] = JSON.parse(this.ingredients)
    return html`
      <div class="scaler">
        <span class="scaler__label">Serves</span>
        <button class="scaler__btn" ?disabled=${this.current <= 1} @click=${() => this.current--}>−</button>
        <span class="scaler__count">${this.current}</span>
        <button class="scaler__btn" @click=${() => this.current++}>+</button>
      </div>
      <ul class="ingredients">
        ${items.map((i) => {
          const qty = quantityToNumeric(i.quantity)
          return html`
          <li>
            <span class="ingredient__name">${i.name}</span>
            <span class="ingredient__amount">${qty > 0 ? this.scale(qty) : ''} ${i.unit ?? ''}</span>
          </li>
        `
        })}
      </ul>
    `
  }
}

customElements.define('recipe-scaler', RecipeScaler)
