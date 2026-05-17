import { expect, test } from '@playwright/test'

const RECIPE_URL = '/recipes/spaghetti-carbonara'

test.use({ javaScriptEnabled: false })

test('recipe page renders key content with JavaScript disabled', async ({ page }) => {
  await page.goto(RECIPE_URL)

  const ingredients = page.locator('.ingredients-list li')
  expect(await ingredients.count()).toBeGreaterThan(0)
  await expect(page.locator('.ingredients-list')).toContainText('spaghetti')

  const steps = page.locator('ol.steps li.step')
  expect(await steps.count()).toBeGreaterThan(0)
  await expect(steps.first()).toContainText('Bring a large pot of salted water to a boil.')
})
