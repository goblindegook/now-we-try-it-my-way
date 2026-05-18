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
  expect(schema.name).toBe('Spaghetti carbonara')
  expect(schema.image).toContain('now-we-try-it-my-way.netlify.app')
  expect(schema.image).not.toContain('/src/assets/')
  expect(schema.prepTime).toBe('PT10M')
  expect(schema.cookTime).toBe('PT20M')
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', schema.image)
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', schema.image)
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')

  await expect(page.getByRole('heading', { level: 1, name: 'Spaghetti carbonara' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Ingredients' })).toBeVisible()

  const ingredients = page.getByRole('list').first().getByRole('listitem')
  expect(await ingredients.count()).toBeGreaterThan(0)
  await expect(page.getByText(/spaghetti/i).first()).toBeVisible()

  const steps = page.getByRole('list').nth(1).getByRole('listitem')
  expect(await steps.count()).toBeGreaterThan(0)
  await expect(page.getByText('Bring a large pot of salted water to a boil.')).toBeVisible()
})
