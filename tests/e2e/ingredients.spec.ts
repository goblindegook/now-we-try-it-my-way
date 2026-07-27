import { expect, test } from '@playwright/test'

test.describe('/ingredients/[slug]', () => {
  test('shows the ingredient name as the page heading', async ({ page }) => {
    await page.goto('/ingredients/garlic')
    await expect(page.getByRole('heading', { level: 1, name: 'Garlic' })).toBeVisible()
  })

  test('shows curated pairings as links when the target has a page', async ({ page }) => {
    await page.goto('/ingredients/garlic')
    await expect(page.getByRole('link', { name: 'tomato', exact: true })).toHaveAttribute(
      'href',
      '/ingredients/tomato',
    )
  })

  test('shows an unresolvable pairing as plain text, not a link', async ({ page }) => {
    await page.goto('/ingredients/garlic')
    await expect(page.getByText('olive oil')).toBeVisible()
    await expect(page.getByRole('link', { name: 'olive oil' })).toHaveCount(0)
  })

  test('shows recipes that use this ingredient', async ({ page }) => {
    await page.goto('/ingredients/garlic')
    await expect(page.getByRole('heading', { level: 2, name: 'Used in' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Moussaka' })).toBeVisible()
  })
})

test.describe('/ingredients index', () => {
  test('shows the page heading', async ({ page }) => {
    await page.goto('/ingredients')
    await expect(page.getByRole('heading', { level: 1, name: 'All Ingredients' })).toBeVisible()
  })

  test('lists every seeded ingredient by name, linking to its page', async ({ page }) => {
    await page.goto('/ingredients')
    await expect(page.getByRole('link', { name: 'Garlic' })).toHaveAttribute('href', '/ingredients/garlic')
    await expect(page.getByRole('link', { name: 'Orange' })).toHaveAttribute('href', '/ingredients/orange')
    await expect(page.getByRole('link', { name: 'Tomato' })).toHaveAttribute('href', '/ingredients/tomato')
  })

  test('search input renders and is scoped to ingredients only', async ({ page }) => {
    await page.goto('/ingredients')
    await expect(page.getByRole('searchbox', { name: 'Search recipes' })).toBeVisible()
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('carbonara')
    await expect(page.getByText('Nothing found.')).toBeVisible({ timeout: 500 })
  })
})

test.describe('recipe ingredient linking', () => {
  test('sidebar links a curated ingredient to its page', async ({ page }) => {
    await page.goto('/recipes/moussaka')
    await expect(page.getByRole('link', { name: 'garlic' })).toHaveAttribute('href', '/ingredients/garlic')
  })

  test('uncurated ingredients render as plain text, not links', async ({ page }) => {
    await page.goto('/recipes/moussaka')
    await expect(page.getByText('onion', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'onion', exact: true })).toHaveCount(0)
  })
})
