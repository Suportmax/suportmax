/* Service Worker do SuportMax CRM — permite abrir o app sem internet.
   Estratégia:
   - Navegação (abrir a página): rede primeiro, caindo para o cache quando offline.
   - Demais requisições do mesmo site: cache primeiro, atualizando em segundo plano.
   - Requisições para outros domínios (ex.: Supabase) nunca são interceptadas. */

const CACHE = 'suportmax-crm-v38';
const SDK_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const ESSENCIAIS = ['./', './CRM-basico.html', './index.html', './manifest.webmanifest', './crm-icon.svg'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ESSENCIAIS.map((u) => c.add(new Request(u, { cache: 'reload' })))))
      .catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  const ehSdkSupabase = req.url === SDK_SUPABASE;
  if (url.origin !== self.location.origin && !ehSdkSupabase) return;

  /* Navegação: tenta a rede, cai para o cache (abre offline) */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
          return resp;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('./CRM-basico.html') || caches.match('./'))
        )
    );
    return;
  }

  /* Guarda o SDK após uma carga online para restaurar sessões já autenticadas offline. */
  if (ehSdkSupabase) {
    e.respondWith(
      caches.match(SDK_SUPABASE).then((cacheado) => cacheado ||
        fetch(req).then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(SDK_SUPABASE, copia)).catch(() => {});
          return resp;
        }).catch(() => caches.match(SDK_SUPABASE))
      )
    );
    return;
  }

  /* Demais: cache primeiro, atualiza em segundo plano */
  e.respondWith(
    caches.match(req).then((cacheado) => {
      const rede = fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
          return resp;
        })
        .catch(() => cacheado);
      return cacheado || rede;
    })
  );
});
