import { expect, test } from '@playwright/test'

const RECIPE_URL = '/recipes/bacalhau-a-bras'

test('shows the wine pairings heading and listed wines for a recipe with pairings', async ({ page }) => {
  await page.goto(RECIPE_URL)

  await expect(page.getByRole('heading', { name: 'Wine Pairings' }).first()).toBeVisible()
  await expect(page.getByText('Encruzado (Dão)').first()).toBeVisible()
  await expect(page.getByText('Arinto (Alentejo)').first()).toBeVisible()
  await expect(page.getByText('Trebbiano (Abruzzo)').first()).toBeVisible()
  await expect(page.getByText('Malvasia puntinata (Lazio)').first()).toBeVisible()
  await expect(page.getByText('Vermentino (Toscana)').first()).toBeVisible()
  await expect(page.getByText('Pecorino (Abruzzo)').first()).toBeVisible()
})

test('omits the wine pairings heading for a recipe without pairings', async ({ page }) => {
  await page.goto('/recipes/spaghetti-carbonara')

  await expect(page.getByRole('heading', { name: 'Wine Pairings' })).toHaveCount(0)
})
