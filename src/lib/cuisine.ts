const FLAGS: Record<string, string> = {
  american: '🇺🇸',
  french: '🇫🇷',
  greek: '🇬🇷',
  indian: '🇮🇳',
  italian: '🇮🇹',
  portuguese: '🇵🇹',
}

export function cuisineToFlag(cuisine: string): string {
  return FLAGS[cuisine] ?? ''
}
