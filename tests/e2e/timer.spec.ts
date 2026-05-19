import { expect, test } from '@playwright/test'

const RECIPE_URL = '/recipes/spaghetti-carbonara'

test.beforeEach(async ({ page }) => {
  await page.goto(RECIPE_URL)
  await page.evaluate(() => localStorage.clear())
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
})

test('shows initial idle state with play icon and duration', async ({ page }) => {
  const btn = page.getByRole('button', { name: /10:00|Done/ }).first()
  await expect(btn).toHaveAttribute('title', /^Start/)
  await expect(btn).toContainText('10:00')
})

test('transitions to running state after clicking start', async ({ page }) => {
  const btn = page.getByRole('button', { name: /10:00|Done/ }).first()
  await btn.click()
  await expect(btn).toHaveAttribute('title', /^Pause/)
})

test('pauses when clicked while running', async ({ page }) => {
  const btn = page.getByRole('button', { name: /10:00|Done/ }).first()
  await btn.click()
  await expect(btn).toHaveAttribute('title', /^Pause/)
  await btn.click()
  await expect(btn).toHaveAttribute('title', /^Start/)
})

test('transitions to done state when time expires', async ({ page }) => {
  const btn = page.getByRole('button', { name: /10:00|Done/ }).first()
  await btn.click()
  await expect(btn).toHaveAttribute('title', /^Pause/)

  await page.evaluate(() => {
    const KEY = 'cookbook-timers'
    const timers: Array<{ startedAt: number | null; duration: number }> = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    const updated = timers.map(t => ({ ...t, startedAt: Date.now() - (t.duration + 5) * 1000 }))
    localStorage.setItem(KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('cookbook-timers-updated'))
  })

  await expect(btn).toContainText('Done', { timeout: 3000 })
  await expect(btn).toHaveAttribute('title', /^Reset/)
})

test('resets to idle after clicking in done state', async ({ page }) => {
  const btn = page.getByRole('button', { name: /10:00|Done/ }).first()
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
  await expect(btn).toHaveAttribute('title', /^Start/)
  await expect(btn).toContainText('10:00')
})

test('timer-dock appears when a timer is started', async ({ page }) => {
  await page.getByRole('button', { name: /10:00|Done/ }).first().click()
  await expect(page.getByText('Timers')).toBeVisible({ timeout: 2000 })
})

test('timer-dock does not render when no timers are in storage', async ({ page }) => {
  await expect(page.getByText('Timers')).toHaveCount(0)
})

test('minimized dock shows the timer countdown instead of a number badge', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('cookbook-timers', JSON.stringify([{
      id: 't1', label: 'Step 1', recipeName: 'Test', recipeUrl: '/recipes/test',
      duration: 600, startedAt: null, elapsed: 300, done: false, soundPlayed: false,
    }]))
    window.dispatchEvent(new CustomEvent('cookbook-timers-updated'))
  })
  await page.getByRole('button', { name: 'Minimise timers' }).click()
  await expect(page.getByText('5:00')).toBeVisible()
})

test('minimized dock shows smallest timer and "and X more" with multiple timers', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('cookbook-timers', JSON.stringify([
      { id: 't1', label: 'Step 1', recipeName: 'Test', recipeUrl: '/recipes/test',
        duration: 600, startedAt: null, elapsed: 300, done: false, soundPlayed: false },
      { id: 't2', label: 'Step 2', recipeName: 'Test', recipeUrl: '/recipes/test',
        duration: 600, startedAt: null, elapsed: 480, done: false, soundPlayed: false },
    ]))
    window.dispatchEvent(new CustomEvent('cookbook-timers-updated'))
  })
  await page.getByRole('button', { name: 'Minimise timers' }).click()
  await expect(page.getByText('2:00 and 1 more')).toBeVisible()
  await expect(page.getByText('and 1 more')).toBeVisible()
})

test('done timer is dismissed on first click without confirmation', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('cookbook-timers', JSON.stringify([{
      id: 't1', label: 'Step 1', recipeName: 'Test', recipeUrl: '/recipes/test',
      duration: 600, startedAt: null, elapsed: 600, done: true, soundPlayed: true,
    }]))
    window.dispatchEvent(new CustomEvent('cookbook-timers-updated'))
  })
  await expect(page.getByText('Done')).toBeVisible()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByText('Timers')).toHaveCount(0)
})

test('timer dock fits within viewport on small screen (375px wide)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(RECIPE_URL)
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload()

  await page.getByRole('button', { name: /10:00|Done/ }).first().click()
  await expect(page.getByText('Timers')).toBeVisible({ timeout: 2000 })

  const overflows = await page.evaluate(() => {
    const el = document.querySelector('timer-dock')
    if (!el) return true
    const rect = el.getBoundingClientRect()
    return rect.left < 0 || rect.right > window.innerWidth
  })
  expect(overflows).toBe(false)
})

test('minimized dock shows no timer when all timers are done', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('cookbook-timers', JSON.stringify([{
      id: 't1', label: 'Step 1', recipeName: 'Test', recipeUrl: '/recipes/test',
      duration: 600, startedAt: null, elapsed: 600, done: true, soundPlayed: true,
    }]))
    window.dispatchEvent(new CustomEvent('cookbook-timers-updated'))
  })
  await page.getByRole('button', { name: 'Minimise timers' }).click()
  await expect(page.locator('timer-dock').getByText(/\d:\d\d/)).toHaveCount(0)
})

test('dock UI state (including position) is restored from session storage', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('cookbook-timers', JSON.stringify([{
      id: 't1', label: 'Step 1', recipeName: 'Test', recipeUrl: '/recipes/test',
      duration: 600, startedAt: null, elapsed: 300, done: false, soundPlayed: false,
    }]))
    localStorage.setItem('cookbook-dock-ui', JSON.stringify({
      minimized: false,
      left: 18,
      top: 18,
      bottom: null,
    }))
    sessionStorage.setItem('cookbook-dock-ui', JSON.stringify({
      minimized: true,
      left: 123,
      top: 45,
      bottom: null,
    }))
  })

  await page.reload()

  await expect(page.getByRole('button', { name: 'Expand timers' })).toBeVisible()
  const dock = page.locator('timer-dock')
  await expect(dock).toHaveCSS('left', '123px')
  await expect(dock).toHaveCSS('top', '45px')
})
