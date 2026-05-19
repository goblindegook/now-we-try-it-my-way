import { expect, test } from '@playwright/test'

const RECIPE_A = '/recipes/moussaka'
const RECIPE_B = '/recipes/aubergine-pepper-smoked-yogurt'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

test('scaler works on second recipe page after SPA navigation', async ({ page }) => {
  await page.getByRole('link', { name: /Moussaka/ }).first().click()
  await page.waitForURL(RECIPE_A)

  await page.getByRole('link', { name: 'Now We Try It My Way' }).click()
  await page.waitForURL('/')

  await page.getByRole('link', { name: /Aubergine, roasted pepper and smoked yogurt/ }).first().click()
  await page.waitForURL(RECIPE_B)

  await page.getByRole('button', { name: 'Increase servings' }).click()
  await expect(page.getByRole('button', { name: 'Decrease servings' })).toBeEnabled()
})

test('checklist works on second recipe page after SPA navigation', async ({ page }) => {
  await page.getByRole('link', { name: /Moussaka/ }).first().click()
  await page.waitForURL(RECIPE_A)

  await page.getByRole('link', { name: 'Now We Try It My Way' }).click()
  await page.waitForURL('/')

  await page.getByRole('link', { name: /Aubergine, roasted pepper and smoked yogurt/ }).first().click()
  await page.waitForURL(RECIPE_B)

  const firstStep = page.getByRole('button', { name: /Mark step 1 complete/ })
  await firstStep.click()
  await expect(firstStep).toContainText('✓')
})
