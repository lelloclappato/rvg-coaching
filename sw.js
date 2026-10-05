// Service worker: un piccolo programma che il browser tiene "accanto" all'app.
// Si mette in mezzo tra l'app e internet: ogni volta che l'app chiede un file,
// decide se prenderlo dalla cache (copia salvata sul telefono) o dalla rete.
// Così l'app si apre anche senza connessione, per esempio in palestra.
// Funziona come quello dell'app Abitudini.
//
// VERSIONE: durante la pubblicazione su GitHub Pages il workflow sostituisce 'dev' con il codice
// del commit (vedi .github/workflows/deploy-pages.yml). Così a ogni pubblicazione questo file
// cambia, il browser se ne accorge e installa la nuova versione.
const VERSION = 'dev';
const PREFIX = 'rvg-coaching-';       // tutte le cache di QUESTA app iniziano così
const CACHE = PREFIX + VERSION;
// In sviluppo (VERSION = 'dev') si prende sempre tutto dalla rete, altrimenti
// le modifiche ai file non si vedrebbero.
const SVILUPPO = VERSION === 'dev';

// file salvati all'installazione: tutto quello che serve per aprire l'app senza connessione
const FILES = [
  './', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './css/base.css', './css/temi.css',
  './js/app.js', './js/dati.js', './js/calcoli.js', './js/stato.js', './js/temi.js',
  './js/icone.js', './js/utili.js', './js/esempio.js', './js/pwa.js',
  './js/viste/comune.js', './js/viste/modale.js', './js/viste/oggi.js', './js/viste/allenamento.js',
  './js/viste/progressi.js', './js/viste/checkin.js', './js/viste/profilo.js',
  './fonts/dm-sans-latin-variabile.woff2', './fonts/barlow-condensed-latin-700.woff2',
  './fonts/zen-kaku-gothic-new-latin-400.woff2', './fonts/zen-kaku-gothic-new-latin-700.woff2',
  './fonts/yuji-boku-latin-400.woff2', './fonts/yuji-boku-kanji.woff2',
  './fonts/cinzel-latin-variabile.woff2', './fonts/barlow-semi-condensed-latin-400.woff2',
  './fonts/barlow-semi-condensed-latin-700.woff2', './fonts/bangers-latin-400.woff2',
  './fonts/nunito-sans-latin-variabile.woff2'
];

self.addEventListener('install', e => {
  // cache: 'reload' = scarica dalla rete ignorando la cache HTTP del browser, per avere i file nuovi
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
  // in sviluppo si attiva subito; in produzione aspetta che l'utente tocchi "Aggiorna"
  if (SVILUPPO) self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Cancella le cache delle versioni vecchie. ATTENZIONE: la memoria delle cache è condivisa
    // con le altre app su lelloclappato.github.io, quindi si toccano solo quelle con il nostro prefisso.
    for (const k of await caches.keys()) {
      if (k.startsWith(PREFIX) && k !== CACHE) await caches.delete(k);
    }
    await self.clients.claim(); // prende subito il controllo delle pagine aperte
  })());
});

// messaggio dall'app: "l'utente ha toccato Aggiorna"
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  // solo richieste GET verso il nostro sito: tutto il resto passa senza toccarlo
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // l'indirizzo principale dell'app (…/ oppure …/index.html) risponde sempre con index.html
  const app = req.mode === 'navigate' && /\/(index\.html)?$/.test(url.pathname);
  e.respondWith(SVILUPPO ? reteConRiserva(req, app) : cachePrima(req, app));
});

// Produzione: "prima la cache". I file della versione installata rispondono subito, anche offline.
async function cachePrima(req, app) {
  const cache = await caches.open(CACHE);
  const trovato = await cache.match(app ? './index.html' : req, { ignoreSearch: app });
  if (trovato) return trovato;
  const r = await fetch(req);                       // file non in elenco: dalla rete...
  if (r.ok) cache.put(req, r.clone());              // ...e se va bene lo si salva per la prossima volta
  return r;
}

// Sviluppo: "prima la rete", la cache solo se manca la connessione.
async function reteConRiserva(req, app) {
  try {
    const r = await fetch(req);
    if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
    return r;
  } catch (err) {
    const c = await caches.open(CACHE);
    return (await c.match(req)) || (app && await c.match('./index.html')) || Response.error();
  }
}
