/* ==================================================================
   SERVICE WORKER — Hub
   Scopo: rendere installabile la PWA e permettere l'avvio offline
   della sola schermata launcher.

   IMPORTANTE: questo SW ha scope "/hub/" (la cartella in cui vive
   sw.js), quindi per default il browser NON gli farà mai intercettare
   richieste a /trip/, /AenaPMI/ o /urbex/: quei progetti restano
   completamente indipendenti, con le proprie eventuali cache e i
   propri Service Worker. Il controllo su same-origin qui sotto è
   una seconda barriera esplicita, per chiarezza e sicurezza.
   ================================================================== */

const CACHE_NAME = 'hub-shell-v1';

// Solo i file che compongono il launcher: nessun asset dei sotto-progetti.
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icona-192.png',
  './icona-512.png'
];

// --- INSTALL: precache dello shell del launcher ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// --- ACTIVATE: ripulisce eventuali cache di versioni precedenti dell'hub ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// --- FETCH: cache-first solo per lo shell dell'hub, stesso-origine ---
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Non intercettare mai richieste non-GET (form, API, ecc.).
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Non intercettare richieste cross-origin o verso altri progetti/percorsi:
  // ognuno dei sotto-progetti gestisce la propria cache in autonomia.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((response) => {
        // Aggiorna la cache solo per risposte valide dello stesso hub.
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
