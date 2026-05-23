import { css, html, LitElement } from 'lit'
import type { TimerRecord } from '../lib/timer-store'
import { getRemaining, getTimers, isRunning, markExpired, removeTimer, upsertTimer } from '../lib/timer-store'

export class TimerDock extends LitElement {
  private static readonly UI_STORAGE_KEY = 'cookbook-dock-ui'
  static properties = {
    timers: { state: true },
    minimized: { state: true },
    pendingClearId: { state: true },
  }

  timers: TimerRecord[] = []
  minimized = false
  pendingClearId: string | null = null
  private pendingClearTimeout: ReturnType<typeof setTimeout> | null = null
  private audioCtx: AudioContext | null = null
  private activeOscillators: OscillatorNode[] = []
  private wakeLock: WakeLockSentinel | null = null
  private wakeLockRequest: Promise<void> | null = null
  private hasUserInteraction = false

  private onFirstUserGesture = () => {
    this.hasUserInteraction = true
    void this.syncWakeLock()
    if (typeof AudioContext === 'undefined') return
    if (!this.audioCtx) this.audioCtx = new AudioContext()
    if (this.audioCtx.state !== 'running') void this.audioCtx.resume()
  }

  private pollInterval: ReturnType<typeof setInterval> | null = null
  private onStoreUpdate = () => this.refresh()
  private onVisibilityChange = () => {
    void this.syncWakeLock()
  }
  private onWakeLockRelease = () => {
    this.wakeLock = null
    void this.syncWakeLock()
  }

  // Drag state (not reactive — we write directly to this.style)
  private dragStartX = 0
  private dragStartY = 0
  private dragOriginX = 0
  private dragOriginY = 0

  private onDragMove = (e: PointerEvent) => {
    const dx = e.clientX - this.dragStartX
    const dy = e.clientY - this.dragStartY
    const dock = this.shadowRoot?.querySelector('.dock') as HTMLElement | null
    const w = dock?.offsetWidth ?? 280
    const h = dock?.offsetHeight ?? 44
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, this.dragOriginX + dx))
    const y = Math.max(8, Math.min(window.innerHeight - h - 8, this.dragOriginY + dy))
    this.style.left = `${x}px`
    this.style.top = `${y}px`
    this.style.right = 'auto'
    this.style.bottom = 'auto'
  }

  private onDragEnd = () => {
    document.body.style.cursor = ''
    document.removeEventListener('pointermove', this.onDragMove)
    document.removeEventListener('pointerup', this.onDragEnd)
    this.savePosition()
  }

  private handleDragStart = (e: PointerEvent) => {
    if ((e.target as Element).closest('button')) return
    const rect = this.getBoundingClientRect()
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.dragOriginX = rect.left
    this.dragOriginY = rect.top
    document.body.style.cursor = 'grabbing'
    document.addEventListener('pointermove', this.onDragMove)
    document.addEventListener('pointerup', this.onDragEnd)
    e.preventDefault()
  }

  connectedCallback() {
    super.connectedCallback()
    markExpired()
    this.timers = getTimers()
    this.pollInterval = setInterval(() => this.refresh(), 500)
    window.addEventListener('cookbook-timers-updated', this.onStoreUpdate)
    window.addEventListener('storage', this.onStoreUpdate)
    window.addEventListener('resize', this.clampPosition, { passive: true })
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    document.addEventListener('click', this.onFirstUserGesture, { capture: true, once: true })
    document.addEventListener('touchend', this.onFirstUserGesture, { capture: true, once: true })
    this.restoreUiState()
    void this.syncWakeLock()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this.pollInterval) clearInterval(this.pollInterval)
    window.removeEventListener('cookbook-timers-updated', this.onStoreUpdate)
    window.removeEventListener('storage', this.onStoreUpdate)
    window.removeEventListener('resize', this.clampPosition)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    document.removeEventListener('click', this.onFirstUserGesture, true)
    document.removeEventListener('touchend', this.onFirstUserGesture, true)
    document.removeEventListener('pointermove', this.onDragMove)
    document.removeEventListener('pointerup', this.onDragEnd)
    if (this.pendingClearTimeout) {
      clearTimeout(this.pendingClearTimeout)
      this.pendingClearTimeout = null
    }
    void this.releaseWakeLock()
  }

  private clampPosition = () => {
    const dock = this.shadowRoot?.querySelector('.dock') as HTMLElement | null
    if (!dock || dock.offsetWidth === 0) return
    const w = dock.offsetWidth
    const h = dock.offsetHeight
    const rect = this.getBoundingClientRect()
    if (!Number.isFinite(rect.left)) return
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, rect.left))
    const y = Math.max(8, Math.min(window.innerHeight - h - 8, rect.top))
    this.style.left = `${x}px`
    this.style.top = `${y}px`
    this.style.right = 'auto'
    this.style.bottom = 'auto'
  }

  private restoreUiState() {
    try {
      const raw = sessionStorage.getItem(TimerDock.UI_STORAGE_KEY)
      if (!raw) return
      const state = JSON.parse(raw) as {
        minimized: boolean
        left: number | null
        top: number | null
        bottom: number | null
      }
      this.minimized = !!state.minimized
      if (state.left != null && (state.top != null || state.bottom != null)) {
        const maxDockWidth = Math.min(380, window.innerWidth - 32)
        const x = Math.max(8, Math.min(window.innerWidth - maxDockWidth - 8, state.left))
        this.style.left = `${x}px`
        this.style.right = 'auto'
        if (state.bottom != null) {
          const b = Math.max(8, Math.min(window.innerHeight - 44 - 8, state.bottom))
          this.style.bottom = `${b}px`
          this.style.top = 'auto'
        } else {
          const y = Math.max(8, Math.min(window.innerHeight - 44 - 8, state.top ?? 0))
          this.style.top = `${y}px`
          this.style.bottom = 'auto'
        }
      }
    } catch (_) {}
  }

  private savePosition() {
    const rect = this.getBoundingClientRect()
    const left = rect.left
    if (!Number.isFinite(left)) {
      this.saveUiState({ left: null, top: null, bottom: null })
      return
    }
    const nearBottom = rect.top + rect.height / 2 > window.innerHeight / 2
    if (nearBottom) {
      const bottom = window.innerHeight - rect.bottom
      this.style.bottom = `${Math.max(8, bottom)}px`
      this.style.top = 'auto'
      this.saveUiState({
        left: Math.round(left),
        top: null,
        bottom: Math.round(Math.max(8, bottom)),
      })
    } else {
      this.style.top = `${Math.max(8, rect.top)}px`
      this.style.bottom = 'auto'
      this.saveUiState({
        left: Math.round(left),
        top: Math.round(Math.max(8, rect.top)),
        bottom: null,
      })
    }
  }

  private saveUiState(pos: { left: number | null; top: number | null; bottom: number | null }) {
    try {
      sessionStorage.setItem(TimerDock.UI_STORAGE_KEY, JSON.stringify({ minimized: this.minimized, ...pos }))
    } catch (_) {}
  }

  private toggleMinimized() {
    this.minimized = !this.minimized
    const rect = this.getBoundingClientRect()
    const left = rect.left
    const hasPos = Number.isFinite(left)
    if (!hasPos) {
      this.saveUiState({ left: null, top: null, bottom: null })
      return
    }
    const nearBottom = rect.top + rect.height / 2 > window.innerHeight / 2
    if (nearBottom) {
      this.saveUiState({
        left: Math.round(left),
        top: null,
        bottom: Math.round(Math.max(8, window.innerHeight - rect.bottom)),
      })
    } else {
      this.saveUiState({
        left: Math.round(left),
        top: Math.round(Math.max(8, rect.top)),
        bottom: null,
      })
    }
  }

  private refresh() {
    markExpired()
    const current = getTimers()
    const toPlay = current.filter((t) => t.done && !t.soundPlayed)
    if (toPlay.length > 0) {
      this.playDone()
      toPlay.forEach((t) => {
        upsertTimer({ ...t, soundPlayed: true })
      })
    }
    const newTimers = getTimers()
    if (this.activeOscillators.length > 0) {
      const newIds = new Set(newTimers.map((t) => t.id))
      if (this.timers.some((t) => t.done && !newIds.has(t.id))) {
        this.silenceActiveSound()
      }
    }
    this.timers = newTimers
    void this.syncWakeLock()
    if (this.pendingClearId && !this.timers.find((t) => t.id === this.pendingClearId)) {
      if (this.pendingClearTimeout) clearTimeout(this.pendingClearTimeout)
      this.pendingClearTimeout = null
      this.pendingClearId = null
    }
  }

  private async syncWakeLock() {
    const hasRunningTimers = this.timers.some((timer) => isRunning(timer))
    const shouldHold = hasRunningTimers && !document.hidden && this.hasUserInteraction
    if (!shouldHold) {
      await this.releaseWakeLock()
      return
    }
    if (!('wakeLock' in navigator) || this.wakeLock || this.wakeLockRequest) return
    this.wakeLockRequest = (async () => {
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        this.wakeLock = sentinel
        this.wakeLock.addEventListener('release', this.onWakeLockRelease)
      } catch {
      } finally {
        this.wakeLockRequest = null
      }
    })()
    await this.wakeLockRequest
  }

  private async releaseWakeLock() {
    if (this.wakeLockRequest) await this.wakeLockRequest
    if (!this.wakeLock) return
    const sentinel = this.wakeLock
    this.wakeLock = null
    sentinel.removeEventListener?.('release', this.onWakeLockRelease)
    try {
      if (!sentinel.released) await sentinel.release()
    } catch {}
  }

  private async playDone() {
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext()
      await this.audioCtx.resume()
      if (this.audioCtx.state !== 'running') return
      const ctx = this.audioCtx
      const now = ctx.currentTime
      const groupStart = [0, 2.0, 4.0]
      const beepOffsets = groupStart.flatMap((g) => [g, g + 0.25, g + 0.5])
      this.activeOscillators = []
      beepOffsets.forEach((offset) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.25, now + offset)
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18)
        osc.start(now + offset)
        osc.stop(now + offset + 0.2)
        this.activeOscillators.push(osc)
      })
    } catch (_) {}
  }

  private silenceActiveSound() {
    for (const osc of this.activeOscillators) {
      try {
        osc.stop()
      } catch {}
    }
    this.activeOscillators = []
  }

  private fmt(s: number): string {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  private toggleTimer(t: TimerRecord) {
    if (t.done) return
    if (isRunning(t)) {
      const elapsed = t.elapsed + (t.startedAt != null ? (Date.now() - t.startedAt) / 1000 : 0)
      upsertTimer({ ...t, startedAt: null, elapsed })
    } else {
      upsertTimer({ ...t, startedAt: Date.now() })
    }
  }

  private dismissTimer(id: string) {
    removeTimer(id)
    this.timers = getTimers()
  }

  private handleClear(id: string) {
    const timer = this.timers.find((t) => t.id === id)
    if (timer?.done) {
      this.silenceActiveSound()
      this.dismissTimer(id)
      return
    }
    if (this.pendingClearId === id) {
      if (this.pendingClearTimeout) clearTimeout(this.pendingClearTimeout)
      this.pendingClearTimeout = null
      this.pendingClearId = null
      this.dismissTimer(id)
    } else {
      if (this.pendingClearTimeout) clearTimeout(this.pendingClearTimeout)
      this.pendingClearId = id
      this.pendingClearTimeout = setTimeout(() => {
        this.pendingClearId = null
        this.pendingClearTimeout = null
      }, 3000)
    }
  }

  private renderMinimizedSummary() {
    const active = this.timers.filter((t) => !t.done)
    if (active.length === 0) return html``
    const smallest = active.reduce((min, t) => (getRemaining(t) < getRemaining(min) ? t : min))
    const remaining = Math.ceil(getRemaining(smallest))
    const moreCount = this.timers.length - 1
    return html`
      <span class="dock__min-timer">${this.fmt(remaining)}${moreCount > 0 ? html` <span class="dock__min-more">and ${moreCount} more</span>` : html``}</span>
    `
  }

  render() {
    if (this.timers.length === 0) return html``
    return html`
      <div class="dock ${this.minimized ? 'dock--minimized' : ''}">
        <div class="dock__header" @pointerdown=${this.handleDragStart}>
          <span class="dock__title">Timers</span>
          ${this.minimized ? this.renderMinimizedSummary() : html``}
          <button
            class="dock__toggle"
            @click=${() => this.toggleMinimized()}
            title=${this.minimized ? 'Expand timers' : 'Minimise timers'}
          >${
            this.minimized
              ? html`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9.5l5-5 5 5"/></svg>`
              : html`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4.5l5 5 5-5"/></svg>`
          }</button>
        </div>
        ${
          !this.minimized
            ? this.timers.map((t) => {
                const remaining = Math.ceil(getRemaining(t))
                const running = isRunning(t)
                return html`
            <div class="timer-item ${t.done ? 'timer-item--done' : running ? 'timer-item--running' : ''}">
              ${
                t.done
                  ? html`<div class="timer-item__done">Done</div>`
                  : html`<button class="dock-btn" @click=${() => this.toggleTimer(t)} title=${running ? 'Pause' : 'Resume'}>${
                      running
                        ? html`<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><rect x="4.5" y="3.5" width="4" height="13" rx="1.5"/><rect x="11.5" y="3.5" width="4" height="13" rx="1.5"/></svg>`
                        : html`<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6 4.25L16 10 6 15.75V4.25z"/></svg>`
                    }</button>
                  <div class="timer-item__time">${this.fmt(remaining)}</div>`
              }
              <a class="timer-item__info" href=${t.recipeUrl}>
                <span class="timer-item__recipe">${t.recipeName}</span>
                <span class="timer-item__label">${t.label}</span>
              </a>
              <button
                class="dock-btn dock-btn--dismiss ${this.pendingClearId === t.id ? 'dock-btn--pending' : ''}"
                @click=${() => this.handleClear(t.id)}
                title=${this.pendingClearId === t.id ? 'Tap again to clear' : 'Clear'}
              ><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l12 12M14 2L2 14"/></svg></button>
            </div>
          `
              })
            : html``
        }
      </div>
    `
  }

  static styles = css`
    :host {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 100;
      font-family: var(--font-sans, system-ui, sans-serif);
    }
    .dock {
      background: #1c1c1c;
      color: #f5f2ee;
      border-radius: 0.75rem;
      width: min(380px, calc(100vw - 2rem));
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      overflow: hidden;
    }
    .dock__header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.875rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      cursor: grab;
      user-select: none;
      touch-action: none;
    }
    .dock__header:active { cursor: grabbing; }
    .dock--minimized .dock__header { border-bottom: none; }
    .dock__title {
      flex: 1;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.5);
    }
    .dock__min-timer {
      font-size: 0.8125rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: rgba(255,255,255,0.85);
      white-space: nowrap;
    }
    .dock__min-more {
      font-weight: 400;
      color: rgba(255,255,255,0.45);
    }
    .dock__toggle {
      all: unset;
      cursor: pointer;
      color: rgba(255,255,255,0.35);
      padding: 0.375rem;
      display: flex;
      align-items: center;
      transition: color 0.15s;
    }
    .dock__toggle:hover { color: rgba(255,255,255,0.8); }
    .timer-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .timer-item:last-child { border-bottom: none; }
    .timer-item--running { background: color-mix(in oklch, var(--color-interactive) 15%, transparent); }
    .timer-item--done { opacity: 0.65; }
    .timer-item__info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
    }
    .timer-item__recipe {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.45);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 0.15s;
    }
    .timer-item__info:hover .timer-item__recipe { color: rgba(255,255,255,0.8); }
    .timer-item__label {
      font-size: 0.8125rem;
      color: #f5f2ee;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .timer-item__time {
      font-size: 2rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      width: 7rem;
      text-align: right;
      flex-shrink: 0;
    }
    .timer-item__done {
      font-size: 1.5rem;
      font-weight: 600;
      width: 9.75rem;
      text-align: left;
      flex-shrink: 0;
    }
    .dock-btn {
      all: unset;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1.125rem;
      transition: background 0.15s;
    }
    .dock-btn:hover { background: rgba(255,255,255,0.2); }
    .dock-btn--dismiss { color: rgba(255,255,255,0.5); }
    .dock-btn--dismiss:hover { color: #fff; background: rgba(255,80,80,0.25); }
    .dock-btn--spacer { visibility: hidden; pointer-events: none; }
    .dock-btn--pending { background: rgba(220,60,60,0.6); color: #fff; }
    .dock-btn--pending:hover { background: rgba(220,60,60,0.8); }
  `
}

customElements.define('timer-dock', TimerDock)
