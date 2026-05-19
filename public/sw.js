const CACHE_VERSION = 'v3'
const PRECACHE_CACHE = `precache-${CACHE_VERSION}`
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`
const OFFLINE_URL = '/offline/'
const STATIC_ASSET_EXTENSIONS = /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|webp|avif|gif|svg|ico)$/i

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE_CACHE)
    await cache.addAll([
        '/',
        '/recipes/',
        OFFLINE_URL,
        '/favicon.ico',
        '/favicon.svg',
        '/fonts/inter/inter-regular-400.ttf',
        '/fonts/inter/inter-600.ttf',
        '/fonts/inter/inter-italic-400.ttf',
        '/fonts/playfair-display/playfair-regular-400.ttf',
        '/fonts/playfair-display/playfair-600.ttf',
        '/fonts/playfair-display/playfair-italic-400.ttf',
      ])

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
