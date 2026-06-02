// Kill-switch service worker.
//
// A previous, unrelated app (a Workbox PWA) was briefly deployed to this same
// Vercel origin and registered a service worker at /sw.js. That worker keeps
// serving its precached shell from visitors' browsers even after the correct
// Nær Næring app was redeployed, because a service worker is bound to the
// origin, not to a deployment.
//
// Nær Næring itself does NOT use a service worker. This file replaces the stale
// one: on its next update check the browser fetches this script, installs it,
// and on activation it wipes all caches, unregisters itself, and reloads every
// open tab — leaving the origin clean. Safe to keep around indefinitely.

self.addEventListener("install", () => {
  // Activate immediately rather than waiting for existing tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop every cache the old worker (or any prior worker) created.
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));

      // Remove this worker so future loads hit the network directly.
      await self.registration.unregister();

      // Force open tabs to reload now that the cache and worker are gone, so
      // visitors stuck on the old shell land on the live app without a manual
      // refresh.
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});
