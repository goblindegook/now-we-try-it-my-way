import { expect, test, type Page } from '@playwright/test'

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

test('category cards render as two columns on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const cards = categoryRegion(page).getByRole('link')
  expect(await cards.count()).toBeGreaterThanOrEqual(3)

  const first = await cards.nth(0).boundingBox()
  const second = await cards.nth(1).boundingBox()
  const third = await cards.nth(2).boundingBox()
  expect(first).not.toBeNull()
  expect(second).not.toBeNull()
  expect(third).not.toBeNull()

  expect(Math.abs(second!.y - first!.y)).toBeLessThan(2)
  expect(third!.y).toBeGreaterThan(first!.y + 2)
})

test('category cards render as four columns on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')

  const cards = categoryRegion(page).getByRole('link')
  expect(await cards.count()).toBeGreaterThanOrEqual(4)

  const first = await cards.nth(0).boundingBox()
  const second = await cards.nth(1).boundingBox()
  const third = await cards.nth(2).boundingBox()
  const fourth = await cards.nth(3).boundingBox()
  expect(first).not.toBeNull()
  expect(second).not.toBeNull()
  expect(third).not.toBeNull()
  expect(fourth).not.toBeNull()

  expect(Math.abs(second!.y - first!.y)).toBeLessThan(2)
  expect(Math.abs(third!.y - first!.y)).toBeLessThan(2)
  expect(Math.abs(fourth!.y - first!.y)).toBeLessThan(2)
})
