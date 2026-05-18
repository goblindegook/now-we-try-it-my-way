import { expect, test } from '@playwright/test'

test('hero section has no "Browse all recipes" CTA link', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.hero__link')).toHaveCount(0)
})

test('latest recipes section has a link to all recipes', async ({ page }) => {
  await page.goto('/')
  const link = page.locator('.section').first().locator('a[href="/recipes"]')
  await expect(link).toBeVisible()
})

test('latest recipes section shows exactly 3 cards', async ({ page }) => {
  await page.goto('/')
  const latestSection = page.locator('.section').first()
  await expect(latestSection.locator('.card')).toHaveCount(3)
})
