import { css, html, LitElement } from 'lit'
import { getRemaining, getTimers, isRunning, markExpired, removeTimer, upsertTimer } from '../lib/timer-store'

export class StepTimer extends LitElement {
  static properties = {
    duration: { type: Number },
    label: { type: String },
    timerId: { type: String, attribute: 'timer-id' },
    recipeName: { type: String, attribute: 'recipe-name' },
    recipeUrl: { type: String, attribute: 'recipe-url' },
    remaining: { state: true },
    running: { state: true },
    done: { state: true },
  }

  duration = 60
  label = ''
  timerId = ''
  recipeName = ''
  recipeUrl = ''
  remaining = 0
  running = false
  done = false

  private interval: ReturnType<typeof setInterval> | null = null
  private onStoreUpdate = () => this.syncFromStore()

  connectedCallback() {
    super.connectedCallback()
    markExpired()
    this.remaining = this.duration
    const record = getTimers().find((t) => t.id === this.timerId)
    if (record) {
      this.done = record.done
      this.running = isRunning(record)
      this.remaining = Math.ceil(getRemaining(record))
      if (this.running) this.startTick()
    }
    window.addEventListener('cookbook-timers-updated', this.onStoreUpdate)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this.interval) clearInterval(this.interval)
    window.removeEventListener('cookbook-timers-updated', this.onStoreUpdate)
  }

  private syncFromStore() {
    if (!this.timerId) return
    const record = getTimers().find((t) => t.id === this.timerId)
    if (!record) {
      if (this.interval) {
        clearInterval(this.interval)
        this.interval = null
      }
      this.running = false
      this.done = false
      this.remaining = this.duration
      return
    }
    const shouldRun = isRunning(record)
    this.done = record.done
    this.remaining = Math.ceil(getRemaining(record))
    if (shouldRun && !this.interval) {
      this.running = true
      this.startTick()
    } else if (!shouldRun && this.interval) {
      clearInterval(this.interval)
      this.interval = null
      this.running = false
    } else {
      this.running = shouldRun
    }
  }

  private startTick() {
    this.interval = setInterval(() => {
      if (!this.timerId) return
      const record = getTimers().find((t) => t.id === this.timerId)
      if (!record || !isRunning(record)) {
        if (this.interval) clearInterval(this.interval)
        this.interval = null
        this.running = false
        return
      }
      const rem = getRemaining(record)
      this.remaining = Math.ceil(rem)
      if (rem <= 0) {
        this.remaining = 0
        this.running = false
        this.done = true
        if (this.interval) clearInterval(this.interval)
        this.interval = null
        upsertTimer({ ...record, done: true, startedAt: null })
      }
    }, 500)
  }

  private toggle() {
    if (this.done) {
      this.reset()
      return
    }
    this.running ? this.pause() : this.start()
  }

  private start() {
    if (!this.timerId) return
    const base = getTimers().find((t) => t.id === this.timerId)
    const elapsed = base?.elapsed ?? 0
    this.running = true
    this.startTick()
    upsertTimer({
      id: this.timerId,
      label: this.label,
      recipeName: this.recipeName,
      recipeUrl: this.recipeUrl,
      duration: this.duration,
      startedAt: Date.now(),
      elapsed,
      done: false,
      soundPlayed: false,
    })
  }

  private pause() {
    if (!this.timerId) return
    const base = getTimers().find((t) => t.id === this.timerId)
    const elapsed = (base?.elapsed ?? 0) + (base?.startedAt != null ? (Date.now() - base.startedAt) / 1000 : 0)
    this.running = false
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    upsertTimer({
      id: this.timerId,
      label: this.label,
      recipeName: this.recipeName,
      recipeUrl: this.recipeUrl,
      duration: this.duration,
      startedAt: null,
      elapsed,
      done: false,
      soundPlayed: false,
    })
  }

  private reset() {
    if (!this.timerId) return
    this.running = false
    this.done = false
    this.remaining = this.duration
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    removeTimer(this.timerId)
  }

  private fmt(s: number): string {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  static styles = css`
    :host { display: inline-flex; align-items: center; gap: 0.5rem; vertical-align: middle; }
    @keyframes timer-pulse {
      0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--color-interactive) 35%, transparent); }
      50%       { box-shadow: 0 0 0 5px color-mix(in oklch, var(--color-interactive) 0%, transparent); }
    }
    @keyframes timer-done-pop {
      0%   { transform: scale(1); }
      45%  { transform: scale(1.07); }
      75%  { transform: scale(0.97); }
      100% { transform: scale(1); }
    }
    .timer {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 2.75rem;
      background: var(--color-canvas, #faf9f7);
      border: 1px solid var(--color-edge, #e5dfd6);
      border-radius: 2rem;
      padding: 0.25rem 0.875rem 0.25rem 0.625rem;
      font-size: 0.8125rem;
      font-family: var(--font-sans, system-ui, sans-serif);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, transform 0.08s ease;
      user-select: none;
    }
    .timer:hover { border-color: var(--color-interactive); }
    .timer:active { transform: scale(0.94); }
    .timer--running {
      background: var(--color-interactive);
      border-color: var(--color-interactive);
      color: #fff;
      animation: timer-pulse 2s ease-in-out infinite;
    }
    .timer--done {
      background: var(--color-positive, #4a7c59);
      border-color: var(--color-positive, #4a7c59);
      color: #fff;
      animation: timer-done-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .timer__icon { display: inline-flex; align-items: center; }
    .timer__time { font-weight: 500; font-variant-numeric: tabular-nums; min-width: 4.5ch; text-align: right; }
    @media (prefers-reduced-motion: reduce) {
      .timer--running { animation: none; }
      .timer--done { animation: none; }
      .timer:active { transform: none; }
    }
  `

  render() {
    const cls = `timer${this.running ? ' timer--running' : ''}${this.done ? ' timer--done' : ''}`
    const icon = this.done
      ? html`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.5L6 12.5 14 4"/></svg>`
      : this.running
        ? html`<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="3" y="2.5" width="3.5" height="11" rx="1"/><rect x="9.5" y="2.5" width="3.5" height="11" rx="1"/></svg>`
        : html`<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 3L13 8 4 13V3z"/></svg>`
    return html`
      <button
        class=${cls}
        @click=${this.toggle}
        title="${this.done ? 'Reset' : this.running ? 'Pause' : 'Start'} timer: ${this.label || this.fmt(this.duration)}"
      >
        <span class="timer__icon">${icon}</span>
        <span class="timer__time">${this.done ? 'Done' : this.fmt(this.remaining)}</span>
      </button>
    `
  }
}

customElements.define('step-timer', StepTimer)
