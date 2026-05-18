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

test('saves checked state to localStorage', async ({ page }) => {
  await page.locator('li.step').first().locator('.step__checkbox').click()
  const stored = await page.evaluate(() => {
    const key = `cookbook-checklist:${location.pathname}`
    return localStorage.getItem(key)
  })
  expect(stored).not.toBeNull()
})

test('persists checked steps across tab close', async ({ browser }) => {
  const context = await browser.newContext()
  const page1 = await context.newPage()
  await page1.goto(RECIPE_URL)
  await page1.evaluate(() => localStorage.removeItem(`cookbook-checklist:${location.pathname}`))
  await page1.reload()

  await page1.locator('li.step').first().locator('.step__checkbox').click()
  await expect(page1.locator('li.step').first()).toHaveAttribute('data-checked', 'true')
  await page1.close()

  const page2 = await context.newPage()
  await page2.goto(RECIPE_URL)
  await expect(page2.locator('li.step').first()).toHaveAttribute('data-checked', 'true')
  await context.close()
})

test('discards checked steps saved more than 24 hours ago', async ({ page }) => {
  await page.evaluate(() => {
    const key = `cookbook-checklist:${location.pathname}`
    const oneDayAgo = Date.now() - 25 * 60 * 60 * 1000
    localStorage.setItem(key, JSON.stringify({ state: [true], savedAt: oneDayAgo }))
  })
  await page.reload()
  await expect(page.locator('li.step').first()).toHaveAttribute('data-checked', 'false')
})
