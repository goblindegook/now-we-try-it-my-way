const FLAGS: Record<string, string> = {
  american: '🇺🇸',
  british: '🇬🇧',
  french: '🇫🇷',
  greek: '🇬🇷',
  indian: '🇮🇳',
  italian: '🇮🇹',
  portuguese: '🇵🇹',
}

export function cuisineToFlag(cuisine: string): string {
  return FLAGS[cuisine] ?? ''
}
