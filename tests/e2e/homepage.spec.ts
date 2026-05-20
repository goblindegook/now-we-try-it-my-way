import { expect, test } from '@playwright/test'


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
  const catSection = page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: 'By category' }),
  })
  const cards = catSection.locator('a.cat-card')
  await expect(cards.first()).toBeVisible()
  const href = await cards.first().getAttribute('href')
  expect(href).toMatch(/^\/[a-z]/)
})

test('category cards show category name', async ({ page }) => {
  await page.goto('/')
  const catSection = page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: 'By category' }),
  })
  const firstCard = catSection.locator('a.cat-card').first()
  await expect(firstCard.locator('.cat-card__name')).toBeVisible()
})
