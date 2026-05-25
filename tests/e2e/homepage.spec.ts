import { expect, test, type Page } from '@playwright/test'

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
