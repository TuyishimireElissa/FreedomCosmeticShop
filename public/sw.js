const STATIC_CACHE = 'fcs-static-v1'
const STATIC_PREFIXES = ['/_next/static/', '/icons/']
const STATIC_EXTENSIONS = /\.(?:css|js|woff2?|ttf|otf|ico)$/i

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('fcs-static-') && key !== STATIC_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/image') || /\.(?:png|jpe?g|webp|avif|gif|svg)$/i.test(url.pathname)) return
  const cacheable = STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) || STATIC_EXTENSIONS.test(url.pathname)
  if (!cacheable) return
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone()
      event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy)))
    }
    return response
  })))
})
