import { expect, test } from '@playwright/test'

const RECIPE_URL = '/recipes/spaghetti-carbonara'

test.beforeEach(async ({ page }) => {
  await page.goto(RECIPE_URL)
  await page.evaluate(() => {
    localStorage.removeItem(`cookbook-checklist:${location.pathname}`)
  })
  await page.reload()
})

test('all steps render as unchecked initially', async ({ page }) => {
  const steps = page.getByRole('button', { name: /Mark step \d+ complete/ })
  const count = await steps.count()
  expect(count).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: /Mark step 1 complete/ })).toContainText('1')
})

test('clicking a step marks it checked', async ({ page }) => {
  const step = page.getByRole('button', { name: /Mark step 1 complete/ })
  await step.click()
  await expect(step).toContainText('✓')
})

test('clicking a checked step unchecks it', async ({ page }) => {
  const step = page.getByRole('button', { name: /Mark step 1 complete/ })
  await step.click()
  await expect(step).toContainText('✓')
  await step.click()
  await expect(step).toContainText('1')
})

test('aria-pressed reflects checked state', async ({ page }) => {
  const step = page.getByRole('button', { name: /Mark step 1 complete/ })
  await expect(step).toHaveAttribute('aria-pressed', 'false')
  await step.click()
  await expect(step).toHaveAttribute('aria-pressed', 'true')
  await step.click()
  await expect(step).toHaveAttribute('aria-pressed', 'false')
})

test('checked state persists across page reload', async ({ page }) => {
  const step = page.getByRole('button', { name: /Mark step 1 complete/ })
  await step.click()
  await page.reload()
  const reloaded = page.getByRole('button', { name: /Mark step 1 complete/ })
  await expect(reloaded).toContainText('✓')
  await expect(reloaded).toHaveAttribute('aria-pressed', 'true')
})

test('only the clicked step is checked — others remain unchecked', async ({ page }) => {
  await page.getByRole('button', { name: /Mark step 1 complete/ }).click()
  await expect(page.getByRole('button', { name: /Mark step 1 complete/ })).toContainText('✓')
  await expect(page.getByRole('button', { name: /Mark step 2 complete/ })).toContainText('2')
})

test('persists checked steps across tab close', async ({ browser }) => {
  const context = await browser.newContext()
  const page1 = await context.newPage()
  await page1.goto(RECIPE_URL)
  await page1.evaluate(() => localStorage.removeItem(`cookbook-checklist:${location.pathname}`))
  await page1.reload()

  await page1.getByRole('button', { name: /Mark step 1 complete/ }).click()
  await expect(page1.getByRole('button', { name: /Mark step 1 complete/ })).toContainText('✓')
  await page1.close()

  const page2 = await context.newPage()
  await page2.goto(RECIPE_URL)
  await expect(page2.getByRole('button', { name: /Mark step 1 complete/ })).toContainText('✓')
  await context.close()
})

test('main landmark includes the ingredients list, not just the steps', async ({ page }) => {
  await expect(page.getByRole('main').getByRole('heading', { level: 2, name: 'Ingredients' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('button', { name: /Mark step 1 complete/ })).toBeVisible()
})

test('discards checked steps saved more than 24 hours ago', async ({ page }) => {
  await page.evaluate(() => {
    const key = `cookbook-checklist:${location.pathname}`
    const oneDayAgo = Date.now() - 25 * 60 * 60 * 1000
    localStorage.setItem(key, JSON.stringify({ state: [true], savedAt: oneDayAgo }))
  })
  await page.reload()
  await expect(page.getByRole('button', { name: /Mark step 1 complete/ })).toContainText('1')
})
