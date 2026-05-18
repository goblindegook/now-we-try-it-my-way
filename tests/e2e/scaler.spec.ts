import { expect, test } from '@playwright/test'

const RECIPE_URL = '/recipes/spaghetti-carbonara'

test.beforeEach(async ({ page }) => {
  await page.goto(RECIPE_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
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

test('step ingredient text scales when servings change', async ({ page }) => {
  const minus = page.locator('#servings-decrease')
  const stepSpaghetti = page.locator('.step-ingredient[data-quantity="400"]').first()

  await expect(stepSpaghetti).toContainText('400 g spaghetti')
  await minus.click() // 3 servings
  await expect(stepSpaghetti).toContainText('300 g spaghetti')
})

test('scaled ingredients render fractional quantities with glyphs', async ({ page }) => {
  const minus = page.locator('#servings-decrease')
  const eggAmount = page.locator('.js-scaled-amount[data-quantity="1"]').first()

  await expect(eggAmount).toContainText('1')
  await minus.click() // 3 servings => 0.75
  await expect(eggAmount).toContainText('¾')
})

test('minus button is disabled at 1 serving', async ({ page }) => {
  const minus = page.locator('#servings-decrease')
  await minus.click()
  await minus.click()
  await minus.click()
  await expect(page.locator('#servings-current')).toHaveText('1')
  await expect(minus).toBeDisabled()
})

test('servings selection persists across reload for the same recipe', async ({ page }) => {
  const minus = page.locator('#servings-decrease')
  const spaghettiAmount = page.locator('.js-scaled-amount[data-quantity="400"]').first()

  await minus.click()
  await expect(page.locator('#servings-current')).toHaveText('3')
  await expect(spaghettiAmount).toContainText('300')
  await page.reload()
  await expect(page.locator('#servings-current')).toHaveText('3')
  await expect(spaghettiAmount).toContainText('300')
})

test('servings selection is scoped per recipe', async ({ page }) => {
  const minus = page.locator('#servings-decrease')
  await minus.click()
  await expect(page.locator('#servings-current')).toHaveText('3')

  await page.goto('/recipes/tomato-couscous')
  await expect(page.locator('#servings-current')).toHaveText('6')

  await page.goto(RECIPE_URL)
  await expect(page.locator('#servings-current')).toHaveText('3')
})
