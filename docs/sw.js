/*
 * Whyolet Text - personal tasks/text editor.
 * Copyright (C) 2026  Denis Ryzhkov <denisr@denisr.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

"use strict";
(() => {
  const cacheName = "v1";

  const precached = [
    "/",  // `/` is requested, not `/index.html`
    "/manifest.json",
    "/anchor.js",
    "/clipboard.js",
    "/crypto.js",
    "/csv.js",
    "/db.js",
    "/error.js",
    "/file.js",
    "/find.js",
    "/font.js",
    "/gdrive.js",
    "/gesture.js",
    "/indent.js",
    "/info.js",
    "/line.js",
    "/local.js",
    "/main.js",
    "/menu.js",
    "/nav.js",
    "/page.js",
    "/search.js",
    "/sel.js",
    // "/sw.js",
    "/ui.js",
    "/undo.js",
    "/style.css",
    "/icons/Icon-192.png",
    "/icons/Icon-512.png",
    "/icons/Icon-maskable-192.png",
    "/icons/Icon-maskable-512.png",
    "/fonts/MaterialSymbolsOutlined.ttf",
    "/fonts/SourceCodePro-VariableFont_wght.ttf",
    "/fonts/Ubuntu-Bold.ttf",
    "/fonts/Ubuntu-Light.ttf",
    "/vendors/hash-wasm/argon2.esm.min.js",
  ];

  const moreStatic = ["png", "ttf"];

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
    const url = request.url.split("?")[0];

    if (new URL(url).origin !== location.origin) {
      return await fetch(request, {
        cache: "no-store",
        // Sync freshness and privacy.
      });
    }

    const cacheMode = moreStatic.some(
      (ext) => url.endsWith(ext)
    ) ? "default" : "no-cache";

    const responsePromise = fetch(request, {
      cache: cacheMode,
    })
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
      return response;
    });

    const cachedResponse = await caches.match(request, {ignoreSearch: true});
    if (cachedResponse) {
      responsePromise.catch(() => {});
      return cachedResponse;
    }

    return await responsePromise;
  };
})();
