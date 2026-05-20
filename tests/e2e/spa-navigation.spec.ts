import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

test('scaler works on second recipe page after SPA navigation', async ({ page }) => {
  await page.getByRole('link', { name: 'All recipes' }).click()
  await page.waitForURL('/recipes')

  const firstTitle = await page.getByRole('main').getByRole('heading', { level: 2 }).first().textContent()
  await page.getByRole('link', { name: firstTitle! }).first().click()
  await page.waitForURL(/\/recipes\/.+/)

  await page.getByRole('link', { name: 'Now We Try It My Way' }).click()
  await page.waitForURL('/')

  const latestSection = page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: 'Latest recipes' }),
  })
  await latestSection.locator('a:has(h2)').first().click()
  await page.waitForURL(/\/recipes\/.+/)

  await page.getByRole('button', { name: 'Increase servings' }).click()
  await expect(page.getByRole('button', { name: 'Decrease servings' })).toBeEnabled()
})

test('checklist works on second recipe page after SPA navigation', async ({ page }) => {
  await page.getByRole('link', { name: 'All recipes' }).click()
  await page.waitForURL('/recipes')

  const firstTitle = await page.getByRole('main').getByRole('heading', { level: 2 }).first().textContent()
  await page.getByRole('link', { name: firstTitle! }).first().click()
  await page.waitForURL(/\/recipes\/.+/)

  await page.getByRole('link', { name: 'Now We Try It My Way' }).click()
  await page.waitForURL('/')

  const latestSection = page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: 'Latest recipes' }),
  })
  await latestSection.locator('a:has(h2)').first().click()
  await page.waitForURL(/\/recipes\/.+/)

  const firstStep = page.getByRole('button', { name: /Mark step 1 complete/ })
  await firstStep.click()
  await expect(firstStep).toContainText('✓')
})
