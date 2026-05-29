import { getByRole } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import './timer-dock'

type FakeWakeLockSentinel = {
  released: boolean
  release: Mock
  addEventListener: Mock
  removeEventListener: Mock
}

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('timer-dock screen reader announcement', () => {
  let dock: HTMLElement

  afterEach(() => {
    if (dock?.isConnected) dock.remove()
  })

  it('announces timer label as complete when timer expires', async () => {
    dock = document.createElement('timer-dock')
    document.body.appendChild(dock)
    await flush()

    setTimers([
      {
        id: 't1',
        label: 'Step 1',
        recipeName: 'Recipe',
        recipeUrl: '/recipes/test',
        duration: 10,
        startedAt: null,
        elapsed: 10,
        done: true,
        soundPlayed: false,
      },
    ])
    await flush()
    await flush()

    const alert = dock.shadowRoot?.querySelector('[role="alert"]')
    expect(alert?.textContent?.trim()).toBe('Step 1 complete')
  })

  it('announces multiple completed timers together', async () => {
    dock = document.createElement('timer-dock')
    document.body.appendChild(dock)
    await flush()

    setTimers([
      {
        id: 't1',
        label: 'Step 1',
        recipeName: 'Recipe',
        recipeUrl: '/recipes/test',
        duration: 10,
        startedAt: null,
        elapsed: 10,
        done: true,
        soundPlayed: false,
      },
      {
        id: 't2',
        label: 'Step 3',
        recipeName: 'Recipe',
        recipeUrl: '/recipes/test',
        duration: 20,
        startedAt: null,
        elapsed: 20,
        done: true,
        soundPlayed: false,
      },
    ])
    await flush()
    await flush()

    const alert = dock.shadowRoot?.querySelector('[role="alert"]')
    expect(alert?.textContent?.trim()).toBe('Step 1, Step 3 complete')
  })

  it('does not announce timers that already had soundPlayed', async () => {
    dock = document.createElement('timer-dock')
    document.body.appendChild(dock)
    await flush()

    setTimers([
      {
        id: 't1',
        label: 'Step 1',
        recipeName: 'Recipe',
        recipeUrl: '/recipes/test',
        duration: 10,
        startedAt: null,
        elapsed: 10,
        done: true,
        soundPlayed: true,
      },
    ])
    await flush()
    await flush()

    const alert = dock.shadowRoot?.querySelector('[role="alert"]')
    expect(alert?.textContent?.trim()).toBe('')
  })
})

describe('timer-dock clear silences audio', () => {
  let dock: HTMLElement

  afterEach(() => {
    if (dock?.isConnected) dock.remove()
  })

  it('stops scheduled oscillators when a done timer is removed externally', async () => {
    const fakeOsc = {
      connect: vi.fn(),
      type: '',
      frequency: { value: 0 },
      start: vi.fn(),
      stop: vi.fn(),
    }
    vi.stubGlobal(
      'AudioContext',
      // biome-ignore lint/complexity/useArrowFunction: must be a constructor
      vi.fn(function () {
        return {
          state: 'running',
          resume: vi.fn(async () => {}),
          currentTime: 0,
          createOscillator: vi.fn(() => fakeOsc),
          createGain: vi.fn(() => ({
            connect: vi.fn(),
            gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          })),
          destination: {},
        }
      }),
    )

    dock = document.createElement('timer-dock')
    document.body.appendChild(dock)
    await flush()

    setTimers([
      {
        id: 't1',
        label: 'Step timer',
        recipeName: 'Recipe',
        recipeUrl: '/recipes/test',
        duration: 10,
        startedAt: null,
        elapsed: 10,
        done: true,
        soundPlayed: false,
      },
    ])
    await flush()
    await flush()

    const stopsBeforeClear = fakeOsc.stop.mock.calls.length

    // Simulate step-timer reset() removing the timer from outside the dock
    setTimers([])
    await flush()

    expect(fakeOsc.stop.mock.calls.length).toBeGreaterThan(stopsBeforeClear)
  })

  it('stops scheduled oscillators when clearing a done timer', async () => {
    const fakeOsc = {
      connect: vi.fn(),
      type: '',
      frequency: { value: 0 },
      start: vi.fn(),
      stop: vi.fn(),
    }
    vi.stubGlobal(
      'AudioContext',
      // biome-ignore lint/complexity/useArrowFunction: must be a constructor
      vi.fn(function () {
        return {
          state: 'running',
          resume: vi.fn(async () => {}),
          currentTime: 0,
          createOscillator: vi.fn(() => fakeOsc),
          createGain: vi.fn(() => ({
            connect: vi.fn(),
            gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          })),
          destination: {},
        }
      }),
    )

    dock = document.createElement('timer-dock')
    document.body.appendChild(dock)
    await flush()

    // soundPlayed: false so refresh() triggers playDone() and oscillators are tracked
    setTimers([
      {
        id: 't1',
        label: 'Step timer',
        recipeName: 'Recipe',
        recipeUrl: '/recipes/test',
        duration: 10,
        startedAt: null,
        elapsed: 10,
        done: true,
        soundPlayed: false,
      },
    ])
    await flush()
    await flush() // let playDone() async chain complete

    const stopsBeforeClear = fakeOsc.stop.mock.calls.length

    const clearBtn = getByRole(dock.shadowRoot as unknown as HTMLElement, 'button', { name: /clear/i })
    clearBtn.click()
    await flush()

    expect(fakeOsc.stop.mock.calls.length).toBeGreaterThan(stopsBeforeClear)
  })
})

describe('timer-dock wake lock', () => {
  let requestWakeLock: ReturnType<typeof vi.fn>
  let sentinel: FakeWakeLockSentinel
  let dock: HTMLElement

  beforeEach(() => {
    sentinel = {
      released: false,
      release: vi.fn(async () => {
        sentinel.released = true
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    requestWakeLock = vi.fn(async () => sentinel)
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: requestWakeLock },
    })
  })

  afterEach(() => {
    if (dock?.isConnected) dock.remove()
  })

  it('requests screen wake lock after user interaction while timer is running', async () => {
    setTimers([makeRunningTimer()])
    dock = document.createElement('timer-dock')
    document.body.appendChild(dock)

    await flush()
    expect(requestWakeLock).not.toHaveBeenCalled()

    await interact()

    expect(requestWakeLock).toHaveBeenCalledWith('screen')
  })

  it('releases wake lock when no timers are running', async () => {
    setTimers([makeRunningTimer()])
    dock = document.createElement('timer-dock')
    document.body.appendChild(dock)
    await interact()
    await flush()
    expect(requestWakeLock).toHaveBeenCalledTimes(1)

    setTimers([
      {
        ...makeRunningTimer(),
        startedAt: null,
      },
    ])
    await flush()

    expect(sentinel.release).toHaveBeenCalledTimes(1)
  })

  it('releases wake lock when dock disconnects', async () => {
    setTimers([makeRunningTimer()])
    dock = document.createElement('timer-dock')
    document.body.appendChild(dock)
    await interact()
    await flush()
    expect(requestWakeLock).toHaveBeenCalledTimes(1)

    dock.remove()
    await flush()

    expect(sentinel.release).toHaveBeenCalledTimes(1)
  })

  it('does not request wake lock when document is hidden', async () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)

    setTimers([makeRunningTimer()])
    dock = document.createElement('timer-dock')
    document.body.appendChild(dock)

    await interact()

    expect(requestWakeLock).not.toHaveBeenCalled()
  })

  it('re-acquires wake lock when tab becomes visible', async () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)

    setTimers([makeRunningTimer()])
    dock = document.createElement('timer-dock')
    document.body.appendChild(dock)
    await interact()
    expect(requestWakeLock).not.toHaveBeenCalled()

    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    await flush()

    expect(requestWakeLock).toHaveBeenCalledWith('screen')
  })
})

function makeRunningTimer() {
  return {
    id: 't1',
    label: 'Step timer',
    recipeName: 'Recipe',
    recipeUrl: '/recipes/test',
    duration: 600,
    startedAt: Date.now(),
    elapsed: 0,
    done: false,
    soundPlayed: false,
  }
}

function setTimers(timers: unknown[]) {
  localStorage.setItem('cookbook-timers', JSON.stringify(timers))
  window.dispatchEvent(new CustomEvent('cookbook-timers-updated'))
}

async function flush() {
  await Promise.resolve()
}

async function interact() {
  document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flush()
}
