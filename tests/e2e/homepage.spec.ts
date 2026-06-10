import { expect, test, type Page } from '@playwright/test'

test.describe('homepage search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('search input renders on homepage', async ({ page }) => {
    await expect(page.getByRole('searchbox', { name: 'Search recipes' })).toBeVisible()
  })

  test('typing a query hides latest and categories sections and shows results', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('spaghetti')
    await expect(page.getByRole('link', { name: 'Spaghetti carbonara' })).toBeVisible({ timeout: 500 })
    await expect(page.getByRole('heading', { level: 2, name: 'Latest recipes' })).not.toBeVisible()
    await expect(page.getByRole('region', { name: 'Categories' })).not.toBeVisible()
  })

  test('clearing the query restores latest and categories sections', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search recipes' })
    await search.fill('spaghetti')
    await expect(page.getByRole('link', { name: 'Spaghetti carbonara' })).toBeVisible({ timeout: 500 })
    await search.fill('')
    await expect(page.getByRole('heading', { level: 2, name: 'Latest recipes' })).toBeVisible({ timeout: 500 })
    await expect(page.getByRole('region', { name: 'Categories' })).toBeVisible()
  })

  test('no-results query shows empty state', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('zqxjvk')
    await expect(page.getByText('Nothing found.')).toBeVisible({ timeout: 500 })
  })

  test('search still works after navigating to homepage via link', async ({ page }) => {
    await page.getByRole('link', { name: /Browse all recipes/i }).click()
    await page.waitForURL('/recipes')
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('spaghetti')
    await expect(page.getByRole('link', { name: 'Spaghetti carbonara' })).toBeVisible({ timeout: 500 })

    await page.getByRole('link', { name: 'Now We Try It My Way' }).click()
    await page.waitForURL('/')

    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('spaghetti')
    await expect(page.getByRole('link', { name: 'Spaghetti carbonara' })).toBeVisible({ timeout: 500 })
  })
})

test('canonical URL always points to the production domain', async ({ page }) => {
  await page.goto('/')
  const canonical = await page.evaluate(
    () => document.querySelector('link[rel="canonical"]')?.getAttribute('href')
  )
  expect(canonical).toBe('https://nowwetry.it/')
})

function categoryRegion(page: Page) {
  return page.getByRole('region', { name: 'Categories' })
}

test('latest recipes section has a link to all recipes', async ({ page }) => {
  await page.goto('/')
  const latestSection = page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: 'Latest recipes' }),
  })
  await expect(latestSection.getByRole('link', { name: /Browse all/ })).toBeVisible()
})

test('latest recipes section shows exactly 3 cards', async ({ page }) => {
  await page.goto('/')
  const latestSection = page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: 'Latest recipes' }),
  })
  await expect(latestSection.locator('a:has(h2)')).toHaveCount(3)
})

test('category section cards link to category page', async ({ page }) => {
  await page.goto('/')
  const cards = categoryRegion(page).getByRole('link')
  await expect(cards.first()).toBeVisible()
  const href = await cards.first().getAttribute('href')
  expect(href).toMatch(/^\/[a-z]/)
})

test('category cards show category name', async ({ page }) => {
  await page.goto('/')
  await expect(categoryRegion(page).getByRole('link').first()).toContainText(/\S+/)
})
