/*
 * Service worker do Shadow Ledger. Sem dependências.
 *
 * - Página (navegação / index.html): rede primeiro, cache como reserva offline.
 * - /assets/* (nomes com hash do Vite, imutáveis): cache primeiro.
 * - Demais arquivos do mesmo site (ícones, manifest, dados): cache e revalida em segundo plano.
 *
 * A "versão por build" vem do próprio index.html: a cada index novo baixado, os
 * assets que ele não referencia mais são apagados do cache. SHELL_VERSION só muda
 * quando a lógica deste arquivo muda.
 */
const SHELL_VERSION = 'v1';
const PAGES = `sl-pages-${SHELL_VERSION}`;
const ASSETS = `sl-assets-${SHELL_VERSION}`;
const STATIC = `sl-static-${SHELL_VERSION}`;
const KEEP = [PAGES, ASSETS, STATIC];

const scopeUrl = new URL(self.registration.scope);
const INDEX_URL = new URL('./', scopeUrl).href;

/** URLs de /assets/ citadas num index.html. */
function assetsIn(html) {
  const out = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)) out.add(new URL(m[1], INDEX_URL).href);
  return [...out];
}

/** Guarda o index, pré-carrega os assets dele e apaga os de builds antigos. */
async function adoptIndex(response) {
  const html = await response.clone().text();
  const pages = await caches.open(PAGES);
  await pages.put(INDEX_URL, response.clone());
  const entries = assetsIn(html);
  const assets = await caches.open(ASSETS);
  const ensure = async (url) => {
    const hit = await assets.match(url);
    if (hit) return hit;
    try {
      const r = await fetch(url);
      if (r.ok) await assets.put(url, r.clone());
      return r;
    } catch {
      return undefined; /* offline: tenta de novo no próximo index */
    }
  };
  // Entradas do index (JS/CSS) + o que elas citam: dados do mapa entram já; fontes, sob demanda.
  const keep = new Set(entries);
  await Promise.all(
    entries.map(async (url) => {
      const r = await ensure(url);
      if (!r || !/\.(js|css)$/.test(url)) return;
      const text = await r.clone().text();
      for (const m of text.matchAll(/assets\/[\w.-]+\.(?:json|woff2?|js|css|png|svg|webp|mp3|ogg)/g)) {
        const dep = new URL(m[0], INDEX_URL).href;
        keep.add(dep);
        if (dep.endsWith('.json') || dep.endsWith('.js')) await ensure(dep);
      }
    }),
  );
  // Apaga o que só builds antigos usavam.
  if (entries.length) for (const req of await assets.keys()) if (!keep.has(req.url)) await assets.delete(req);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const r = await fetch(INDEX_URL, { cache: 'no-store' });
        if (r.ok) await adoptIndex(r);
      } catch {
        /* sem rede na instalação: segue sem pré-cache */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith('sl-') && !KEEP.includes(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== scopeUrl.origin) return;
  if (url.pathname.endsWith('/sw.js')) return;

  // Página: rede primeiro.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const r = await fetch(req);
          if (r.ok && (r.headers.get('content-type') || '').includes('text/html')) event.waitUntil(adoptIndex(r.clone()));
          return r;
        } catch {
          const cached = await caches.match(INDEX_URL);
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Assets com hash: cache primeiro.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS);
        const hit = await cache.match(req);
        if (hit) return hit;
        const r = await fetch(req);
        if (r.ok) event.waitUntil(cache.put(req, r.clone()));
        return r;
      })(),
    );
    return;
  }

  // Demais estáticos do site: cache e revalida.
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC);
      const hit = await cache.match(req);
      const net = fetch(req)
        .then((r) => {
          if (r.ok && r.type === 'basic') cache.put(req, r.clone());
          return r;
        })
        .catch(() => undefined);
      if (hit) {
        event.waitUntil(net);
        return hit;
      }
      return (await net) || Response.error();
    })(),
  );
});
