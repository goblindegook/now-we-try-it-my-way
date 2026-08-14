import { retext } from 'retext'
import retextSmartypants from 'retext-smartypants'

const smartypantsProcessor = retext().use(retextSmartypants)

export function smarten(text: string): string {
  return String(smartypantsProcessor.processSync(text))
}
