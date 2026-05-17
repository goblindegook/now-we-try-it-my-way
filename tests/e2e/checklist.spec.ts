import { expect, test } from '@playwright/test'

const RECIPE_URL = '/recipes/spaghetti-carbonara'

test.beforeEach(async ({ page }) => {
  await page.goto(RECIPE_URL)
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
})

test('all steps render as unchecked initially', async ({ page }) => {
  const steps = page.locator('li.step')
  const count = await steps.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    await expect(steps.nth(i)).toHaveAttribute('data-checked', 'false')
  }
})

test('clicking a step marks it checked', async ({ page }) => {
  const step = page.locator('li.step').first()
  await expect(step).toHaveAttribute('data-checked', 'false')
  await step.locator('.step__checkbox').click()
  await expect(step).toHaveAttribute('data-checked', 'true')
})

test('clicking a checked step unchecks it', async ({ page }) => {
  const step = page.locator('li.step').first()
  await step.locator('.step__checkbox').click()
  await expect(step).toHaveAttribute('data-checked', 'true')
  await step.locator('.step__checkbox').click()
  await expect(step).toHaveAttribute('data-checked', 'false')
})

test('checked state persists across page reload', async ({ page }) => {
  const step = page.locator('li.step').first()
  await step.locator('.step__checkbox').click()
  await expect(step).toHaveAttribute('data-checked', 'true')
  await page.reload()
  await expect(page.locator('li.step').first()).toHaveAttribute('data-checked', 'true')
})

test('only the clicked step is checked — others remain unchecked', async ({ page }) => {
  const steps = page.locator('li.step')
  await steps.first().locator('.step__checkbox').click()
  await expect(steps.first()).toHaveAttribute('data-checked', 'true')
  await expect(steps.nth(1)).toHaveAttribute('data-checked', 'false')
})
