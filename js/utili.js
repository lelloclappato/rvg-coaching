// Piccole funzioni di uso generale, usate un po' da tutti gli altri file.

// Codice casuale e unico, per dare un "nome interno" a ogni riga dei dati.
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Rende sicuro un testo prima di metterlo nell'HTML: senza questo, un nome di esercizio
// che contiene "<" potrebbe rompere la pagina.
export function esc(testo) {
  return String(testo ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Trasforma quello che l'utente scrive in un numero. Accetta sia "62,5" sia "62.5".
// Restituisce null se il campo è vuoto o non è un numero.
export function numero(testo) {
  if (testo === null || testo === undefined) return null;
  const pulito = String(testo).trim().replace(',', '.');
  if (pulito === '') return null;
  const n = Number(pulito);
  return Number.isFinite(n) ? n : null;
}

// Scrive un numero all'italiana: 62.5 → "62,5", 95 → "95".
export function fmt(n, decimali = 1) {
  if (n === null || n === undefined || n === '') return '';
  const arrotondato = Math.round(Number(n) * 10 ** decimali) / 10 ** decimali;
  return String(arrotondato).replace('.', ',');
}

// Data di oggi nel formato AAAA-MM-GG (quello che usano i dati salvati).
export function oggi() {
  const d = new Date();
  const due = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

// "2026-10-05" → "5 ott 2026"
export function dataBreve(chiave) {
  if (!chiave) return '';
  const [a, m, g] = chiave.split('-').map(Number);
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${g} ${mesi[m - 1]} ${a}`;
}

// Numeri romani (stile Dark fantasy) e kanji (stile Inchiostro) per i primi numeri.
const ROMANI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const KANJI = ['', '一', '二', '三', '四', '五'];
export function romano(n) { return ROMANI[n] || String(n); }
export function kanji(n) { return KANJI[n] || String(n); }
