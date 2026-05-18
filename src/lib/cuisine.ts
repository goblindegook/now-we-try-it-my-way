const FLAGS: Record<string, string> = {
  italian: '🇮🇹',
  greek: '🇬🇷',
  indian: '🇮🇳',
  portuguese: '🇵🇹',
  french: '🇫🇷',
}

export function cuisineToFlag(cuisine: string): string {
  return FLAGS[cuisine] ?? ''
}
