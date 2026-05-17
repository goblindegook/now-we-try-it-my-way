import { expect, test } from '@playwright/test'

const RECIPE_URL = '/recipes/spaghetti-carbonara'

test.beforeEach(async ({ page }) => {
  await page.goto(RECIPE_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('shows initial idle state with play icon and duration', async ({ page }) => {
  const timer = page.locator('step-timer').first()
  const btn = timer.locator('button')
  await expect(btn).toContainText('▶')
  await expect(btn).toContainText('10:00')
})

test('transitions to running state after clicking start', async ({ page }) => {
  const btn = page.locator('step-timer').first().locator('button')
  await btn.click()
  await expect(btn).toContainText('⏸')
})

test('pauses when clicked while running', async ({ page }) => {
  const btn = page.locator('step-timer').first().locator('button')
  await btn.click()
  await expect(btn).toContainText('⏸')
  await btn.click()
  await expect(btn).toContainText('▶')
})

test('transitions to done state when time expires', async ({ page }) => {
  const btn = page.locator('step-timer').first().locator('button')
  await btn.click()
  await expect(btn).toContainText('⏸')

  await page.evaluate(() => {
    const KEY = 'cookbook-timers'
    const timers: Array<{ startedAt: number | null; duration: number }> = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    const updated = timers.map(t => ({ ...t, startedAt: Date.now() - (t.duration + 5) * 1000 }))
    localStorage.setItem(KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('cookbook-timers-updated'))
  })

  await expect(btn).toContainText('Done', { timeout: 3000 })
  await expect(btn).toContainText('✓')
})

test('resets to idle after clicking in done state', async ({ page }) => {
  const btn = page.locator('step-timer').first().locator('button')
  await btn.click()
  await page.evaluate(() => {
    const KEY = 'cookbook-timers'
    const timers: Array<{ startedAt: number | null; duration: number }> = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    const updated = timers.map(t => ({ ...t, startedAt: Date.now() - (t.duration + 5) * 1000 }))
    localStorage.setItem(KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('cookbook-timers-updated'))
  })
  await expect(btn).toContainText('Done', { timeout: 3000 })
  await btn.click()
  await expect(btn).toContainText('▶')
  await expect(btn).toContainText('10:00')
})

test('timer-dock appears when a timer is started', async ({ page }) => {
  await page.locator('step-timer').first().locator('button').click()
  await expect(page.locator('timer-dock').getByText('Timers')).toBeVisible({ timeout: 2000 })
})

test('timer-dock does not render when no timers are in storage', async ({ page }) => {
  await expect(page.locator('timer-dock')).not.toContainText('Timers')
})
