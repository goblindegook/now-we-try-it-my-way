import { expect, test } from '@playwright/test'

const RECIPE_URL = '/recipes/spaghetti-carbonara'

test.use({ javaScriptEnabled: false })

test('home page exposes default OG and Twitter metadata', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Now We Try It My Way')
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /favicon\.ico$/)
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /favicon\.ico$/)
})

test('recipe page renders key content with JavaScript disabled', async ({ page }) => {
  await page.goto(RECIPE_URL)

  const schemaJson = await page.locator('script[type="application/ld+json"][data-schema="recipe"]').textContent()
  expect(schemaJson).toBeTruthy()
  const schema = JSON.parse(schemaJson ?? '{}')
  expect(schema['@context']).toBe('https://schema.org')
  expect(schema['@type']).toBe('Recipe')
  expect(schema.name).toBe('Spaghetti Carbonara')
  expect(schema.image).toContain('now-we-try-it-my-way.netlify.app')
  expect(schema.image).not.toContain('/src/assets/')
  expect(schema.prepTime).toBe('PT10M')
  expect(schema.cookTime).toBe('PT20M')
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', schema.image)
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', schema.image)
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')

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
