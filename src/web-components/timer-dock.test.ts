import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import './timer-dock'

type FakeWakeLockSentinel = {
  released: boolean
  release: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
}

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
  await Promise.resolve()
}

async function interact() {
  document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flush()
}

describe('timer-dock wake lock', () => {
  let requestWakeLock: ReturnType<typeof vi.fn>
  let sentinel: FakeWakeLockSentinel
  let dock: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    sessionStorage.clear()

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
    vi.restoreAllMocks()
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
