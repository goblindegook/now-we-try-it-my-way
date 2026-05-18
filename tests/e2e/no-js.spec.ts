import { expect, test } from '@playwright/test'

const RECIPE_URL = '/recipes/spaghetti-carbonara'

test.use({ javaScriptEnabled: false })

test('recipe page renders key content with JavaScript disabled', async ({ page }) => {
  await page.goto(RECIPE_URL)

  const schemaJson = await page.locator('script[type="application/ld+json"][data-schema="recipe"]').textContent()
  expect(schemaJson).toBeTruthy()
  const schema = JSON.parse(schemaJson ?? '{}')
  expect(schema['@context']).toBe('https://schema.org')
  expect(schema['@type']).toBe('Recipe')
  expect(schema.name).toBe('Spaghetti Carbonara')

  await expect(page.locator('.h-recipe')).toHaveCount(1)
  await expect(page.locator('.h-recipe .p-name')).toContainText('Spaghetti Carbonara')

  const ingredients = page.locator('.ingredients-list li')
  expect(await ingredients.count()).toBeGreaterThan(0)
  await expect(page.locator('.ingredients-list')).toContainText('spaghetti')
  await expect(page.locator('.h-recipe .p-ingredient').first()).toContainText('spaghetti')

  const steps = page.locator('ol.steps li.step')
  expect(await steps.count()).toBeGreaterThan(0)
  await expect(page.locator('.h-recipe .e-instructions')).toHaveCount(1)
  await expect(steps.first()).toContainText('Bring a large pot of salted water to a boil.')
})
