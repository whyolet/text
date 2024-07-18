"use strict";
(() => {
  const cacheName = "v1";

  const precached = [
    "/",
    "/manifest.json",
    "/script.js",
    "/style.css",
    "/icons/Icon-192.png",
    "/icons/Icon-512.png",
    "/fonts/MaterialSymbolsOutlined.ttf",
    "/fonts/MaterialSymbolsOutlined.woff2",
    "/fonts/Ubuntu-Bold.ttf",
    "/fonts/Ubuntu-Bold.woff2",
    "/fonts/Ubuntu-Light.ttf",
    "/fonts/Ubuntu-Light.woff2",
  ];

  const precache = async () => {
    const cache = await caches.open(cacheName);
    return cache.addAll(precached);
  };

  addEventListener("install", (event) => {
    event.waitUntil(precache());
    skipWaiting(); // ...for reload
  });

  addEventListener("activate", (event) => {
    event.waitUntil(clients.claim());
  });

  addEventListener("fetch", (event) => {
    event.respondWith(cacheResponse(event.request));
  });

  const cacheResponse = async (request) => {
    const responsePromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
      return response;
    });

    return (
      await caches.match(request)
    ) || (
      await responsePromise
    );
  };
})();
