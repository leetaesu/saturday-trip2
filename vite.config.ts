import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({ base: './', plugins: [react(), tailwindcss(), {
  name: 'trip-offline-cache',
  generateBundle(_options, bundle) {
    const files = ['./', './index.html', './family.png', './family-banner.png', ...['naksan-beach','sokcho-beach','naksansa','sokcho-market','hangyeryeong'].map(name => `./places/${name}.jpg`), ...Object.keys(bundle).map(name => `./${name}`)];
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const PREFIX = 'mom70-' + new URL(self.registration.scope).pathname + '-';
const CACHE = PREFIX + '${Date.now()}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()).then(async () => { for (const client of await self.clients.matchAll()) client.postMessage('offline-ready'); })); });
self.addEventListener('message', event => { if (event.data === 'check-ready') event.waitUntil(caches.has(CACHE).then(ready => { if (ready) event.source?.postMessage('offline-ready'); })); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') { try { const response = await fetch(event.request); if (response.ok) return response; } catch {} return (await cache.match('./index.html')) || Response.error(); }
    const cached = await cache.match(event.request); if (cached) return cached;
    return fetch(event.request);
  })());
});` });
  },
}] });
