import { expect, test } from '@playwright/test'

function addWakeLockMock(page: import('@playwright/test').Page) {
  return page.addInitScript(() => {
    const sentinel = {
      released: false,
      release: async function () { this.released = true },
      addEventListener: () => {},
      removeEventListener: () => {},
    }
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: async () => sentinel },
    })
  })
}

test.describe('wake lock toggle — supported', () => {
  test.beforeEach(async ({ page }) => {
    await addWakeLockMock(page)
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('eye button renders in nav with correct label', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Keep screen awake' })).toBeVisible()
  })

  test('eye button starts inactive', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Keep screen awake' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('clicking eye button marks it active', async ({ page }) => {
    await page.getByRole('button', { name: 'Keep screen awake' }).click()
    await expect(page.getByRole('button', { name: 'Keep screen awake' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('clicking eye button again marks it inactive', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Keep screen awake' })
    await btn.click()
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  test('localStorage written with enabled:true and 24h expiresAt on enable', async ({ page }) => {
    const before = Date.now()
    await page.getByRole('button', { name: 'Keep screen awake' }).click()
    const state = await page.evaluate(() => {
      const raw = localStorage.getItem('cookbook-wake-lock')
      return raw ? JSON.parse(raw) as { enabled: boolean; expiresAt: number } : null
    })
    expect(state).not.toBeNull()
    expect(state!.enabled).toBe(true)
    expect(state!.expiresAt).toBeGreaterThanOrEqual(before + 86_399_000)
  })

  test('localStorage cleared on disable', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Keep screen awake' })
    await btn.click()
    await btn.click()
    const raw = await page.evaluate(() => localStorage.getItem('cookbook-wake-lock'))
    expect(raw).toBeNull()
  })

  test('active state restored from localStorage after navigation', async ({ page }) => {
    await page.getByRole('button', { name: 'Keep screen awake' }).click()
    await page.goto('/recipes')
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Keep screen awake' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('expired localStorage state starts button inactive', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'cookbook-wake-lock',
        JSON.stringify({ enabled: true, expiresAt: Date.now() - 1000 }),
      )
    })
    await page.reload()
    await expect(page.getByRole('button', { name: 'Keep screen awake' })).toHaveAttribute('aria-pressed', 'false')
  })
})

test.describe('wake lock toggle — unsupported', () => {
  test('eye button is hidden when wakeLock not in navigator', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined })
    })
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Keep screen awake' })).toBeHidden()
  })
})
