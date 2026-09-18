import { expect, test } from '@playwright/test'

const RECIPE_URL = '/recipes/bacalhau-a-bras'

test('shows the wine pairings heading and listed wines for a recipe with pairings', async ({ page }) => {
  await page.goto(RECIPE_URL)

  await expect(page.getByRole('heading', { name: 'Wine Pairings' }).first()).toBeVisible()
  await expect(page.getByText("Trebbiano d'Abruzzo").first()).toBeVisible()
  await expect(page.getByText('Malvasia puntinata').first()).toBeVisible()
  await expect(page.getByText('Vermentino toscano').first()).toBeVisible()
  await expect(page.getByText('Pecorino abruzzese').first()).toBeVisible()
})

test('omits the wine pairings heading for a recipe without pairings', async ({ page }) => {
  await page.goto('/recipes/spaghetti-carbonara')

  await expect(page.getByRole('heading', { name: 'Wine Pairings' })).toHaveCount(0)
})
