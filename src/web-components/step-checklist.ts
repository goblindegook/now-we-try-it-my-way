import { html, LitElement } from 'lit'

function storageKey() {
  return `cookbook-checklist:${location.pathname}`
}

export class StepChecklist extends LitElement {
  createRenderRoot() {
    return this
  }

  connectedCallback() {
    super.connectedCallback()
    this.restoreState()
    this.addEventListener('click', (e: Event) => {
      const btn = (e.target as Element).closest('.step__checkbox')
      if (!btn) return
      const li = btn.closest('li.step')
      if (!li) return
      const checked = li.getAttribute('data-checked') === 'true'
      li.setAttribute('data-checked', String(!checked))
      this.saveState()
      if (!checked) {
        li.classList.remove('step--pop')
        void (li as HTMLElement).offsetWidth
        li.classList.add('step--pop')
        li.addEventListener('animationend', () => li.classList.remove('step--pop'), { once: true })
      }
    })
  }

  private saveState() {
    const steps = this.querySelectorAll<HTMLElement>('li.step')
    const state = Array.from(steps).map((li) => li.getAttribute('data-checked') === 'true')
    try {
      localStorage.setItem(storageKey(), JSON.stringify({ state, savedAt: Date.now() }))
    } catch (_) {}
  }

  private restoreState() {
    try {
      const raw = localStorage.getItem(storageKey())
      if (!raw) return
      const parsed = JSON.parse(raw)
      const TTL = 24 * 60 * 60 * 1000
      if (!parsed.savedAt || Date.now() - parsed.savedAt > TTL) {
        localStorage.removeItem(storageKey())
        return
      }
      const state: boolean[] = parsed.state
      const steps = this.querySelectorAll<HTMLElement>('li.step')
      steps.forEach((li, i) => {
        if (state[i] !== undefined) li.setAttribute('data-checked', String(state[i]))
      })
    } catch (_) {}
  }

  render() {
    return html`<slot></slot>`
  }
}

customElements.define('step-checklist', StepChecklist)
