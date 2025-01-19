"use strict";
(() => {
  const cacheName = "v1";

  const precached = [
    "/",  // `/` is requested, not `/index.html`
    "/manifest.json",
    "/clipboard.js",
    "/crypto.js",
    "/db.js",
    "/error.js",
    "/file.js",
    "/find.js",
    "/indent.js",
    "/line.js",
    "/main.js",
    "/menu.js",
    "/nav.js",
    "/page.js",
    "/search.js",
    "/sel.js",
    "/sw.js",
    "/ui.js",
    "/undo.js",
    "/style.css",
    "/icons/Icon-192.png",
    "/icons/Icon-512.png",
    "/icons/Icon-maskable-192.png",
    "/icons/Icon-maskable-512.png",
    "/fonts/MaterialSymbolsOutlined.ttf",
    "/fonts/MaterialSymbolsOutlined.woff2",
    "/fonts/SourceCodePro-VariableFont_wght.ttf",
    "/fonts/Ubuntu-Bold.ttf",
    "/fonts/Ubuntu-Bold.woff2",
    "/fonts/Ubuntu-Light.ttf",
    "/fonts/Ubuntu-Light.woff2",
  ];

  const moreStatic = ["png", "ttf", "woff2"];

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
    const url = request.url;
    const cacheMode = moreStatic.some(
      (ext) => url.endsWith(ext)
    ) ? "default" : "no-cache";

    const responsePromise = fetch(request, {
      cache: cacheMode
    })
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
