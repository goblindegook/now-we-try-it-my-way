const CACHE_VERSION = 'v2'
const PRECACHE_CACHE = `precache-${CACHE_VERSION}`
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`
const OFFLINE_URL = '/offline/'
const CORE_URLS = ['/', '/recipes/', OFFLINE_URL, '/favicon.ico', '/favicon.svg']
const SITEMAP_CANDIDATES = ['/sitemap-index.xml', '/sitemap-0.xml', '/sitemap.xml']
const STATIC_ASSET_EXTENSIONS = /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|webp|avif|gif|svg|ico)$/i

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE_CACHE)
    await cache.addAll(CORE_URLS)

    const sitemapUrls = await discoverSitemapUrls()
    if (sitemapUrls.length > 0) {
      await cache.addAll(sitemapUrls)
    }

    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const expected = new Set([PRECACHE_CACHE, RUNTIME_CACHE])
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => !expected.has(key)).map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
    return
  }

  if (url.pathname === '/sw.js') return

  if (STATIC_ASSET_EXTENSIONS.test(url.pathname)) {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(networkFirst(request))
})

async function handleNavigation(request) {
  const precache = await caches.open(PRECACHE_CACHE)
  const runtime = await caches.open(RUNTIME_CACHE)

  try {
    const response = await fetch(request)
    if (response.ok) {
      runtime.put(request, response.clone())
    }
    return response
  } catch {
    return (
      (await precache.match(OFFLINE_URL, { ignoreSearch: true })) ||
      (await precache.match('/', { ignoreSearch: true })) ||
      new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    )
  }
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return (
      (await cache.match(request)) ||
      (await caches.match(request, { ignoreSearch: true })) ||
      new Response('', { status: 504, statusText: 'Gateway Timeout' })
    )
  }
}

async function discoverSitemapUrls() {
  const queue = [...SITEMAP_CANDIDATES]
  const visited = new Set()
  const routes = new Set(CORE_URLS)

  while (queue.length > 0) {
    const candidate = queue.shift()
    if (!candidate || visited.has(candidate)) continue
    visited.add(candidate)

    try {
      const response = await fetch(candidate, { cache: 'no-store' })
      if (!response.ok) continue

      const xml = await response.text()
      const entries = extractLocValues(xml)
      for (const entry of entries) {
        const parsed = new URL(entry, self.location.origin)
        if (parsed.origin !== self.location.origin) continue

        const localPath = `${parsed.pathname}${parsed.search}`
        if (localPath.endsWith('.xml')) queue.push(localPath)
        routes.add(localPath)
      }
    } catch {
      // Skip missing sitemap files.
    }
  }

  return Array.from(routes)
}

function extractLocValues(xml) {
  const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g)
  const urls = []
  for (const match of matches) {
    if (!match[1]) continue
    urls.push(match[1].trim())
  }
  return urls
}
