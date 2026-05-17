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
      sessionStorage.setItem(storageKey(), JSON.stringify(state))
    } catch (_) {}
  }

  private restoreState() {
    try {
      const raw = sessionStorage.getItem(storageKey())
      if (!raw) return
      const state: boolean[] = JSON.parse(raw)
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
