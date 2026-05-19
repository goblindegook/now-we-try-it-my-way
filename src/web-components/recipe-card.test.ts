import { getByRole, queryByRole } from '@testing-library/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import './recipe-card'

describe('recipe-card', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders link and recipe metadata from attributes', async () => {
    document.body.innerHTML = `
      <recipe-card
        slug="spaghetti-carbonara"
        title="Spaghetti carbonara"
        category="Mains"
        cuisine="italian"
        prep-time="10 minutes"
        cook-time="20 minutes"
        photo-src="/_astro/spaghetti.webp"
      ></recipe-card>
    `
    const card = document.body.querySelector<HTMLElement & { updateComplete?: Promise<unknown> }>('recipe-card')
    expect(card).not.toBeNull()
    await (card as { updateComplete?: Promise<unknown> }).updateComplete

    const root = document.body
    const link = getByRole(root, 'link', { name: /spaghetti carbonara/i })
    expect(link.getAttribute('href')).toBe('/recipes/spaghetti-carbonara')
    expect(getByRole(root, 'img', { name: /spaghetti carbonara/i }).getAttribute('src')).toBe('/_astro/spaghetti.webp')
    expect(root.textContent).toContain('Mains')
    expect(root.textContent).toContain('Prep: 10 minutes')
    expect(root.textContent).toContain('Cook: 20 minutes')
  })

  it('renders image placeholder when photo-src is missing', async () => {
    document.body.innerHTML = `
      <recipe-card
        slug="moussaka"
        title="Moussaka"
        category="Mains"
      ></recipe-card>
    `
    const card = document.body.querySelector<HTMLElement & { updateComplete?: Promise<unknown> }>('recipe-card')
    expect(card).not.toBeNull()
    await (card as { updateComplete?: Promise<unknown> }).updateComplete

    const root = document.body
    expect(queryByRole(root, 'img')).toBeNull()
    expect(getByRole(root, 'link', { name: /moussaka/i })).toBeTruthy()
  })
})
