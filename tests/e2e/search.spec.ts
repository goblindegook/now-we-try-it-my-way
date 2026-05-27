import { expect, test, type Page } from '@playwright/test'

test.describe('/recipes search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recipes')
  })

  test('shows 12 recipes per page with pagination controls', async ({ page }) => {
    await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveCount(12)

    const pagination = page.getByRole('navigation', { name: 'Recipe pages' })
    await expect(pagination).toBeVisible()
    await expect(pagination.getByRole('link', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    await expect(pagination.getByRole('link', { name: 'Page 2' })).toHaveAttribute('href', '/recipes/page/2')
    await expect(pagination.getByRole('link', { name: 'Next page' })).toHaveAttribute('href', '/recipes/page/2')
    await expect(page.getByText('current page')).toHaveCount(0)
  })

  test('second page shows remaining recipes', async ({ page }) => {
    await page.goto('/recipes/page/2')

    const recipeCards = page.getByRole('main').getByRole('heading', { level: 2 })
    const recipeCount = await recipeCards.count()
    expect(recipeCount).toBeGreaterThan(0)
    expect(recipeCount).toBeLessThanOrEqual(12)
    const pagination = page.getByRole('navigation', { name: 'Recipe pages' })
    await expect(pagination.getByRole('link', { name: 'Previous page' })).toHaveAttribute('href', '/recipes')
    await expect(pagination.getByRole('link', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('current page')).toHaveCount(0)
  })

  test('search input renders', async ({ page }) => {
    await expect(page.getByRole('searchbox', { name: 'Search recipes' })).toBeVisible()
  })

  test('static grid visible by default', async ({ page }) => {
    await expect(page.getByRole('main').getByRole('heading', { level: 2 }).first()).toBeVisible()
  })

  test('typing a query hides static grid and shows results', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('spaghetti')
    await expect(page.getByRole('link', { name: 'Spaghetti carbonara' })).toBeVisible({ timeout: 500 })
    await expect(page.getByRole('link', { name: 'Moussaka' })).not.toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Recipe pages' })).toBeHidden()
  })

  test('results include matching recipe', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('spaghetti')
    await expect(page.getByRole('link', { name: 'Spaghetti carbonara' })).toBeVisible({ timeout: 500 })
  })

  test('result cards link to recipe pages', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('spaghetti')
    await expect(page.getByRole('link', { name: 'Spaghetti carbonara' })).toHaveAttribute('href', '/recipes/spaghetti-carbonara', { timeout: 500 })
  })

  test('clearing input restores static grid', async ({ page }) => {
    const name = await getFirstRecipeName(page)
    const search = page.getByRole('searchbox', { name: 'Search recipes' })
    await search.fill('spaghetti')
    await expect(page.getByRole('link', { name: 'Spaghetti carbonara' })).toBeVisible({ timeout: 500 })
    await search.fill('')
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible({ timeout: 500 })
    await expect(page.getByRole('navigation', { name: 'Recipe pages' })).toBeVisible()
  })

  test('no-results query shows empty state', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('zqxjvk')
    await expect(page.getByText('Nothing found.')).toBeVisible({ timeout: 500 })
    await expect(page.getByRole('link', { name: 'Moussaka' })).not.toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Recipe pages' })).toBeHidden()
  })

  test('empty state clears back to static grid', async ({ page }) => {
    const name = await getFirstRecipeName(page)
    const search = page.getByRole('searchbox', { name: 'Search recipes' })
    await search.fill('zqxjvk')
    await expect(page.getByText('Nothing found.')).toBeVisible({ timeout: 500 })
    await search.fill('')
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible({ timeout: 500 })
    await expect(page.getByText('Nothing found.')).not.toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Recipe pages' })).toBeVisible()
  })
})

test.describe('category page search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mains')
  })

  test('search input renders on category page', async ({ page }) => {
    await expect(page.getByRole('searchbox', { name: 'Search recipes' })).toBeVisible()
  })

  test('results are scoped to the category', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('spaghetti')
    await expect(page.getByRole('link', { name: 'Spaghetti carbonara' })).toBeVisible({ timeout: 500 })
    await expect(page.getByRole('heading', { name: 'Mains', level: 1 })).toBeVisible()
  })

  test('no-results query shows empty state on category page', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('zqxjvk')
    await expect(page.getByText('Nothing found.')).toBeVisible({ timeout: 500 })
  })
})

async function getFirstRecipeName(page: Page) {
  const firstRecipeHeading = page.getByRole('main').getByRole('heading', { level: 2 }).first()
  await expect(firstRecipeHeading).toBeVisible()
  const firstRecipeName = await firstRecipeHeading.innerText()
  return firstRecipeName.trim()
}