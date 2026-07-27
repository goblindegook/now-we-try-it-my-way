import { html, LitElement } from 'lit'

class IngredientCardElement extends LitElement {
  static properties = {
    slug: { type: String },
    name: { type: String },
    photoSrc: { type: String, attribute: 'photo-src' },
  }

  slug = ''
  name = ''
  photoSrc = ''

  protected override createRenderRoot() {
    return this
  }

  render() {
    const href = `/ingredients/${this.slug}`
    return html`<a href=${href} class="recipe-card">
      <div class="recipe-card__image-wrap">
        ${
          this.photoSrc
            ? html`<img src=${this.photoSrc} alt=${this.name} class="recipe-card__image" loading="lazy" />`
            : html`<div class="recipe-card__placeholder" aria-hidden="true"></div>`
        }
      </div>
      <div class="recipe-card__body">
        <div class="recipe-card__top">
          <p class="recipe-card__category">Ingredients</p>
        </div>
        <h2 class="recipe-card__title">${this.name}</h2>
      </div>
    </a>`
  }
}

if (!customElements.get('ingredient-card')) customElements.define('ingredient-card', IngredientCardElement)
