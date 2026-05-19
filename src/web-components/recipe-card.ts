import { html, LitElement } from 'lit'
import { cuisineToFlag } from '../lib/cuisine'

class RecipeCardElement extends LitElement {
  static properties = {
    slug: { type: String },
    title: { type: String },
    category: { type: String },
    cuisine: { type: String },
    prepTime: { type: String, attribute: 'prep-time' },
    cookTime: { type: String, attribute: 'cook-time' },
    photoSrc: { type: String, attribute: 'photo-src' },
  }

  slug = ''
  title = ''
  category = ''
  cuisine = ''
  prepTime = ''
  cookTime = ''
  photoSrc = ''

  protected override createRenderRoot() {
    return this
  }

  render() {
    const href = `/recipes/${this.slug}`
    const flag = cuisineToFlag(this.cuisine)
    return html`<a href=${href} class="recipe-card">
      <div class="recipe-card__image-wrap">
        ${
          this.photoSrc
            ? html`<img src=${this.photoSrc} alt=${this.title} class="recipe-card__image" loading="lazy" />`
            : html`<div class="recipe-card__placeholder" aria-hidden="true"></div>`
        }
      </div>
      <div class="recipe-card__body">
        <div class="recipe-card__top">
          <p class="recipe-card__category">${this.category}</p>
          ${flag ? html`<span class="recipe-card__flag">${flag}</span>` : null}
        </div>
        <h2 class="recipe-card__title">${this.title}</h2>
        ${
          this.prepTime || this.cookTime
            ? html`<div class="recipe-card__meta">
                ${this.prepTime ? html`<span>Prep: ${this.prepTime}</span>` : null}
                ${this.cookTime ? html`<span>Cook: ${this.cookTime}</span>` : null}
              </div>`
            : null
        }
      </div>
    </a>`
  }
}

if (!customElements.get('recipe-card')) customElements.define('recipe-card', RecipeCardElement)
