import { expect, test } from '@playwright/test'

const RECIPE_URL = '/recipes/spaghetti-carbonara'

test.beforeEach(async ({ page }) => {
  await page.goto(RECIPE_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('shows initial serving count matching the recipe default', async ({ page }) => {
  await expect(page.getByText(/400\s*g\s+spaghetti/i).first()).toBeVisible()
})

test('shows initial ingredient amounts for default servings', async ({ page }) => {
  await expect(page.getByText(/400\s*g\s+spaghetti/i).first()).toBeVisible()
})

test('decrement reduces serving count by 1', async ({ page }) => {
  const minus = page.getByRole('button', { name: 'Decrease servings' })
  await expect(minus).toBeEnabled()
  await minus.click()
  await expect(page.getByText(/300\s*g\s+spaghetti/i).first()).toBeVisible()
})

test('increment increases serving count by 1', async ({ page }) => {
  const plus = page.getByRole('button', { name: 'Increase servings' })
  await expect(plus).toBeEnabled()
  await plus.click()
  await expect(page.getByText(/500\s*g\s+spaghetti/i).first()).toBeVisible()
})

test('ingredient amounts scale proportionally when servings change', async ({ page }) => {
  const minus = page.getByRole('button', { name: 'Decrease servings' })
  await expect(page.getByText(/400\s*g\s+spaghetti/i).first()).toBeVisible()
  await minus.click()
  await expect(page.getByText(/300\s*g\s+spaghetti/i).first()).toBeVisible()
  await minus.click()
  await expect(page.getByText(/200\s*g\s+spaghetti/i).first()).toBeVisible()
})

test('step ingredient text scales when servings change', async ({ page }) => {
  const minus = page.getByRole('button', { name: 'Decrease servings' })
  await expect(page.getByText(/400\s*g\s+spaghetti/i).last()).toBeVisible()
  await minus.click()
  await expect(page.getByText(/300\s*g\s+spaghetti/i).last()).toBeVisible()
})

test('scaled ingredients render fractional quantities with glyphs', async ({ page }) => {
  const minus = page.getByRole('button', { name: 'Decrease servings' })
  await expect(page.getByText(/^1$/).first()).toBeVisible()
  await minus.click()
  await expect(page.getByText('¾').first()).toBeVisible()
})

test('minus button is disabled at 1 serving', async ({ page }) => {
  const minus = page.getByRole('button', { name: 'Decrease servings' })
  await minus.click()
  await minus.click()
  await minus.click()
  await expect(page.getByText(/100\s*g\s+spaghetti/i).first()).toBeVisible()
  await expect(minus).toBeDisabled()
})

test('servings selection persists across reload for the same recipe', async ({ page }) => {
  const minus = page.getByRole('button', { name: 'Decrease servings' })
  await minus.click()
  await expect(page.getByText(/300\s*g\s+spaghetti/i).first()).toBeVisible()
  await page.reload()
  await expect(page.getByText(/300\s*g\s+spaghetti/i).first()).toBeVisible()
})

test('servings selection is scoped per recipe', async ({ page }) => {
  const minus = page.getByRole('button', { name: 'Decrease servings' })
  await minus.click()
  await expect(page.getByText(/300\s*g\s+spaghetti/i).first()).toBeVisible()

  await page.goto('/recipes/tomato-couscous')
  await expect(page.getByText(/600\s*ml\s+tomato juice/i).first()).toBeVisible()

  await page.goto(RECIPE_URL)
  await expect(page.getByText(/300\s*g\s+spaghetti/i).first()).toBeVisible()
})
