import { expect, test } from '@playwright/test'

const RECIPE_URL = '/recipes/spaghetti-carbonara'

test.beforeEach(async ({ page }) => {
  await page.goto(RECIPE_URL)
})

test('shows initial serving count matching the recipe default', async ({ page }) => {
  await expect(page.locator('#servings-current')).toHaveText('4')
})

test('shows initial ingredient amounts for default servings', async ({ page }) => {
  // spaghetti is the first ingredient: 400g at 4 servings
  await expect(page.locator('.js-scaled-amount[data-quantity="400"]').first()).toContainText('400')
})

test('decrement reduces serving count by 1', async ({ page }) => {
  const minus = page.locator('#servings-decrease')
  await expect(minus).toBeEnabled()
  await minus.click()
  await expect(page.locator('#servings-current')).toHaveText('3')
})

test('increment increases serving count by 1', async ({ page }) => {
  const plus = page.locator('#servings-increase')
  await expect(plus).toBeEnabled()
  await plus.click()
  await expect(page.locator('#servings-current')).toHaveText('5')
})

test('ingredient amounts scale proportionally when servings change', async ({ page }) => {
  const minus = page.locator('#servings-decrease')
  const spaghettiAmount = page.locator('.js-scaled-amount[data-quantity="400"]').first()

  await expect(spaghettiAmount).toContainText('400')
  await minus.click() // 3 servings
  await expect(spaghettiAmount).toContainText('300')
  await minus.click() // 2 servings
  await expect(spaghettiAmount).toContainText('200')
})

test('minus button is disabled at 1 serving', async ({ page }) => {
  const minus = page.locator('#servings-decrease')
  await minus.click()
  await minus.click()
  await minus.click()
  await expect(page.locator('#servings-current')).toHaveText('1')
  await expect(minus).toBeDisabled()
})
