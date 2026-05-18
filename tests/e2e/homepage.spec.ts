import { expect, test } from '@playwright/test'


test('latest recipes section has a link to all recipes', async ({ page }) => {
  await page.goto('/')
  const latestSection = page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: 'Latest recipes' }),
  })
  await expect(latestSection.getByRole('link', { name: /View all/ })).toBeVisible()
})

test('latest recipes section shows exactly 3 cards', async ({ page }) => {
  await page.goto('/')
  const latestSection = page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: 'Latest recipes' }),
  })
  await expect(latestSection.locator('a:has(h2)')).toHaveCount(3)
})
