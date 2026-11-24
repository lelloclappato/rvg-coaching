// La sincronizzazione di questa app tra telefono e computer, tramite il tuo Google Drive.
// Il funzionamento (uguale in tutte le mie app) è in js/sincro/; qui c'è solo quello che riguarda Hexis:
// quali dati si sincronizzano e cosa chiedere la prima volta.
import * as archivio from './dati.js';
import { creaSincro, conta } from './sincro/sincro.js';

// L'"ID client OAuth" del progetto Google Cloud "Le mie app" (pubblico: identifica l'app, non dà accesso a niente).
// Vuoto = niente sincronizzazione: l'app funziona come prima, solo sul dispositivo.
export const GOOGLE_CLIENT_ID = '494586901323-p0t3hln8h1rjg8jqhh4a9frl0ncap7h3.apps.googleusercontent.com';

// Cosa si sincronizza. Resta solo su questo dispositivo: il giorno dell'ultimo backup.
// Ogni voce della scheda (un esercizio in un giorno) si sincronizza intera, con le sue serie; così ogni cliente del coach.
export const SCHEMA = {
  raccolte: [
    { percorso: 'esercizi', chiave: e => e.id },
    { percorso: 'programma', chiave: v => v.id },
    { percorso: 'checkin', chiave: c => c.settimana },
    { percorso: 'sessioni', chiave: x => `${x.settimana}-${x.giorno}` },
    { percorso: 'clienti', chiave: c => c.id } // solo per chi fa il coach: ogni cliente si sincronizza intero
  ],
  singoli: ['profilo']
};

let ridisegna = () => {};
let chiedi = async () => 'annulla';
export function quandoArrivanoDati(fn) { ridisegna = fn; }
// la domanda della prima volta la fa app.js, con la sua finestra
export function comeChiedere(fn) { chiedi = fn; }

const plurale = (n, uno, tanti) => `${n} ${n === 1 ? uno : tanti}`;
function descrivi(p) {
  const n = conta(p);
  return [plurale(n.programma || 0, 'esercizio in scheda', 'esercizi in scheda'), n.checkin ? plurale(n.checkin, 'check-in', 'check-in') : ''].filter(Boolean).join(' e ');
}

export const sincro = creaSincro({
  prefisso: 'rvg-coaching', // nomi interni di prima: cambiarli farebbe perdere i dati già sincronizzati
  nomeFile: 'rvg-coaching.json',
  schema: SCHEMA,
  clientId: GOOGLE_CLIENT_ID,
  leggiDati: () => archivio.dati(),
  scriviDati: async nuovi => { if (await archivio.sostituisci(nuovi)) ridisegna(); },
  descrivi,
  chiediPrimaUnione: x => chiedi(x)
});

archivio.quandoSalva(() => sincro.dopoSalvataggio());
