import { expect, type Page, test } from '@playwright/test'

test.use({ javaScriptEnabled: false })

async function getRecipeSchema(page: Page) {
  const schemaJson = await page.locator('script[type="application/ld+json"][data-schema="recipe"]').textContent()
  expect(schemaJson).toBeTruthy()
  return JSON.parse(schemaJson ?? '{}')
}

test('home page exposes default OG and Twitter metadata', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Now We Try It My Way')
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /favicon\.ico$/)
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /favicon\.ico$/)
})

test('recipe page has valid Recipe schema.org JSON-LD', async ({ page }) => {
  await page.goto('/recipes/spaghetti-carbonara')
  const schema = await getRecipeSchema(page)

  expect(schema).toMatchObject({
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: 'Spaghetti carbonara',
    prepTime: 'PT10M',
    cookTime: 'PT20M',
    recipeCuisine: 'italian',
  })
  expect(schema.recipeInstructions[0]).toMatchObject({
    url: 'https://nowwetry.it/recipes/spaghetti-carbonara#step-1',
  })
  expect(schema.image).toContain('nowwetry.it')
  expect(schema.image).not.toContain('/src/assets/')
})

test('recipe page defaults prepTime to zero when not specified', async ({ page }) => {
  await page.goto('/recipes/mayonnaise')
  const schema = await getRecipeSchema(page)

  expect(schema).toMatchObject({
    prepTime: 'PT0M',
    cookTime: 'PT10M',
    totalTime: 'PT10M',
  })
})

test('recipe page sets article OG and Twitter card metadata', async ({ page }) => {
  await page.goto('/recipes/spaghetti-carbonara')
  const schema = await getRecipeSchema(page)

  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', schema.image)
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', schema.image)
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
})

test('recipe page applies smart punctuation to the description', async ({ page }) => {
  await page.goto('/recipes/tartiflette')
  const schema = await getRecipeSchema(page)

  expect(schema).toMatchObject({ description: 'I hope you’re not on a diet.' })
  await expect(page.getByRole('main').getByText('I hope you’re not on a diet.')).toBeVisible()
})

test('recipe page applies smart punctuation to step text', async ({ page }) => {
  await page.goto('/recipes/tzatziki')
  const schema = await getRecipeSchema(page)

  const stepText = 'until it’s ground to a paste.'
  expect(schema.recipeInstructions.some((step: { text: string }) => step.text.includes(stepText))).toBe(true)
  await expect(page.getByText(stepText)).toBeVisible()
})

test('recipe page renders title and ingredients heading', async ({ page }) => {
  await page.goto('/recipes/spaghetti-carbonara')

  await expect(page.getByRole('heading', { level: 1, name: 'Spaghetti carbonara' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Ingredients' })).toBeVisible()
})

test('recipe page renders ingredient list', async ({ page }) => {
  await page.goto('/recipes/spaghetti-carbonara')

  const ingredients = page.getByRole('list').first().getByRole('listitem')
  expect(await ingredients.count()).toBeGreaterThan(0)
  await expect(page.getByText(/spaghetti/i).first()).toBeVisible()
})

test('recipe page renders step instructions', async ({ page }) => {
  await page.goto('/recipes/spaghetti-carbonara')

  const steps = page.getByRole('list').nth(1).getByRole('listitem')
  expect(await steps.count()).toBeGreaterThan(0)
  await expect(page.getByText('Bring a large pot of salted water to a boil.')).toBeVisible()
})
