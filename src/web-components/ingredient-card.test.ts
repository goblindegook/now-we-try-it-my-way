import { getByRole, queryByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'
import './ingredient-card'

describe('ingredient-card', () => {
  it('renders link, "Ingredient" label, and name from attributes', async () => {
    document.body.innerHTML = `
      <ingredient-card
        slug="garlic"
        name="Garlic"
        photo-src="/_astro/garlic.webp"
      ></ingredient-card>
    `
    const card = document.body.querySelector<HTMLElement & { updateComplete?: Promise<unknown> }>('ingredient-card')
    expect(card).not.toBeNull()
    await card?.updateComplete

    const root = document.body
    const link = getByRole(root, 'link', { name: /garlic/i })
    expect(link.getAttribute('href')).toBe('/ingredients/garlic')
    expect(root.querySelector('img')?.getAttribute('src')).toBe('/_astro/garlic.webp')
    expect(root.textContent).toContain('Ingredient')
  })

  it('renders image placeholder when photo-src is missing', async () => {
    document.body.innerHTML = `<ingredient-card slug="saffron" name="Saffron"></ingredient-card>`
    const card = document.body.querySelector<HTMLElement & { updateComplete?: Promise<unknown> }>('ingredient-card')
    expect(card).not.toBeNull()
    await card?.updateComplete

    const root = document.body
    expect(queryByRole(root, 'img')).toBeNull()
    expect(getByRole(root, 'link', { name: /saffron/i })).toBeTruthy()
  })
})
