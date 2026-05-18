import { expect, test } from '@playwright/test'

test.describe('/recipes search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recipes')
  })

  test('search input renders', async ({ page }) => {
    await expect(page.locator('.recipe-search-input')).toBeVisible()
  })

  test('static grid visible by default', async ({ page }) => {
    await expect(page.locator('#recipes-grid')).toBeVisible()
    await expect(page.locator('.recipe-search-results-grid')).not.toBeVisible()
  })

  test('typing a query hides static grid and shows results', async ({ page }) => {
    await page.locator('.recipe-search-input').fill('spaghetti')
    await expect(page.locator('.recipe-search-results-grid')).toBeVisible({ timeout: 500 })
    await expect(page.locator('#recipes-grid')).not.toBeVisible()
  })

  test('results include matching recipe', async ({ page }) => {
    await page.locator('.recipe-search-input').fill('spaghetti')
    await expect(page.locator('.recipe-search-card').filter({ hasText: 'Spaghetti carbonara' })).toBeVisible({ timeout: 500 })
  })

  test('result cards link to recipe pages', async ({ page }) => {
    await page.locator('.recipe-search-input').fill('spaghetti')
    const card = page.locator('.recipe-search-card').filter({ hasText: 'Spaghetti carbonara' })
    await expect(card).toHaveAttribute('href', '/recipes/spaghetti-carbonara', { timeout: 500 })
  })

  test('clearing input restores static grid', async ({ page }) => {
    await page.locator('.recipe-search-input').fill('spaghetti')
    await expect(page.locator('.recipe-search-results-grid')).toBeVisible({ timeout: 500 })
    await page.locator('.recipe-search-input').fill('')
    await expect(page.locator('#recipes-grid')).toBeVisible({ timeout: 500 })
    await expect(page.locator('.recipe-search-results-grid')).not.toBeVisible()
  })

  test('no-results query shows empty state', async ({ page }) => {
    await page.locator('.recipe-search-input').fill('zqxjvk')
    await expect(page.locator('.recipe-search-empty__heading')).toContainText('Nothing matched.', { timeout: 500 })
    await expect(page.locator('.recipe-search-empty__sub')).toBeVisible()
    await expect(page.locator('#recipes-grid')).not.toBeVisible()
  })

  test('empty state clears back to static grid', async ({ page }) => {
    await page.locator('.recipe-search-input').fill('zqxjvk')
    await expect(page.locator('.recipe-search-empty__heading')).toBeVisible({ timeout: 500 })
    await page.locator('.recipe-search-input').fill('')
    await expect(page.locator('#recipes-grid')).toBeVisible({ timeout: 500 })
    await expect(page.locator('.recipe-search-empty__heading')).not.toBeVisible()
  })
})

test.describe('category page search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mains')
  })

  test('search input renders on category page', async ({ page }) => {
    await expect(page.locator('.recipe-search-input')).toBeVisible()
  })

  test('results are scoped to the category', async ({ page }) => {
    await page.locator('.recipe-search-input').fill('spaghetti')
    const cards = page.locator('.recipe-search-card')
    await expect(cards.first()).toBeVisible({ timeout: 500 })
    const count = await cards.count()
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).locator('.recipe-search-card__category')).toContainText('Mains')
    }
  })

  test('no-results query shows empty state on category page', async ({ page }) => {
    await page.locator('.recipe-search-input').fill('zqxjvk')
    await expect(page.locator('.recipe-search-empty__heading')).toContainText('Nothing matched.', { timeout: 500 })
  })
})
