// Gli stili dell'app. Uno stile cambia tre cose:
//  1. colori e caratteri → sono nel file css/temi.css, scelti con l'attributo data-tema su <html>
//  2. alcune parole (es. "Inizia allenamento" diventa "Salpa!") → sono qui sotto, in "testi"
//  3. come si scrivono i numeri di giorni e serie (G1, 一, I…) → funzioni qui sotto
// Schermate, dati e funzioni restano identici: per aggiungere uno stile basta
// una voce qui e un blocco di colori in temi.css.
import { romano, kanji } from './utili.js';

const TESTI_BASE = {
  saluto: nome => (nome ? `Ciao ${nome}` : 'Ciao'),
  sottotitolo: s => `Settimana ${s} · RVG Coaching`,
  etichettaOggi: 'Allenamento di oggi',
  inizia: 'Inizia allenamento',
  continua: 'Continua allenamento',
  rivedi: 'Rivedi allenamento',
  notaCoach: 'Riccardo · nota per oggi',
  titoloProgressi: 'Progressi',
  sopraProgressi: n => `${n} settimane di dati`,
  inizio: 'Inizio',
  record: 'Record stimato',
  seiQui: 'Oggi',
  titoloCheckin: 'Check-in',
  invia: 'Invia a Riccardo',
  inviato: 'Salvato ✓',
  su: '↑ Range chiuso: la prossima volta aumenta il carico',
  giu: '↓ Sotto il minimo: la prossima volta resta su questo carico',
  schede: { oggi: 'Oggi', allenamento: 'Allenamento', progressi: 'Progressi', checkin: 'Check-in', profilo: 'Profilo' },
  // parole che cambiano tra "con Riccardo" e "da solo"
  notaScheda: 'Riccardo:',
  notaAtleta: 'Nota per Riccardo',
  condividiGiorno: 'Manda il riepilogo a Riccardo',
  noteCheckin: 'Altro da dire a Riccardo',
  campoNotaCoach: 'Nota del coach',
  // con modalità "da solo" queste sostituiscono quelle sopra (vedi testiPer)
  solo: {
    notaCoach: 'Promemoria per oggi',
    notaScheda: 'Promemoria:',
    notaAtleta: 'Note',
    condividiGiorno: 'Condividi il riepilogo',
    noteCheckin: 'Altre note',
    campoNotaCoach: 'Promemoria (lo vedi quando apri l\'esercizio)'
  }
};

export const TEMI = {
  originale: {
    nome: 'Originale',
    descrizione: 'Scuro con il viola RVG',
    barra: '#0F0E14',                       // colore della barra del browser sul telefono
    anteprima: ['#0F0E14', '#6A4DF0', '#F4F2FA'],
    testi: TESTI_BASE,
    numGiorno: n => `G${n}`,
    numSerie: n => String(n),
    segnoFatto: '✓'
  },
  inchiostro: {
    nome: 'Inchiostro',
    descrizione: 'Pennello nero su carta, timbro rosso',
    barra: '#F3EEE3',
    anteprima: ['#F3EEE3', '#141210', '#B3261E'],
    testi: {
      ...TESTI_BASE,
      sottotitolo: s => `Settimana ${s}`,
      inizia: 'INIZIA ALLENAMENTO', continua: 'CONTINUA ALLENAMENTO', rivedi: 'RIVEDI ALLENAMENTO',
      invia: 'INVIA A RICCARDO', inviato: 'SALVATO 済'
    },
    numGiorno: n => kanji(n),
    numSerie: n => String(n),
    segnoFatto: '済'
  },
  dark: {
    nome: 'Dark fantasy',
    descrizione: 'Nero ferro e rosso sangue',
    barra: '#0B0A0A',
    anteprima: ['#0B0A0A', '#A3141B', '#ECE6DA'],
    testi: {
      ...TESTI_BASE,
      saluto: nome => (nome ? `CIAO ${nome.toUpperCase()}` : 'CIAO'),
      sottotitolo: s => `SETTIMANA ${romano(s)}`,
      etichettaOggi: "L'allenamento di oggi",
      inizia: 'INIZIA', continua: 'CONTINUA', rivedi: 'RIVEDI',
      titoloProgressi: 'PROGRESSI', titoloCheckin: 'CHECK-IN',
      invia: 'INVIA A RICCARDO', inviato: 'SALVATO ✓',
      su: '↑ RANGE CHIUSO: LA PROSSIMA VOLTA AUMENTA IL CARICO',
      giu: '↓ SOTTO IL MINIMO: RESTA SU QUESTO CARICO'
    },
    numGiorno: n => romano(n),
    numSerie: n => romano(n),
    segnoFatto: '✓'
  },
  avventura: {
    nome: 'Avventura',
    descrizione: 'Carta nautica, oceano e rotte',
    barra: '#1E5A8C',
    anteprima: ['#F2E3C4', '#1E5A8C', '#C24E1A'],
    testi: {
      ...TESTI_BASE,
      saluto: nome => (nome ? `Ciao ${nome}!` : 'Ciao!'),
      sottotitolo: s => `Settimana ${s} · rotta in corso`,
      etichettaOggi: 'Tappa di oggi',
      inizia: 'Salpa!', continua: 'Riprendi la rotta', rivedi: 'Rivedi la tappa',
      notaCoach: 'Messaggio del capitano Riccardo',
      titoloProgressi: 'La tua rotta',
      sopraProgressi: n => `${n} settimane di navigazione`,
      inizio: 'Porto di partenza', record: 'Tesoro (record stimato)', seiQui: 'Sei qui',
      titoloCheckin: 'Diario di bordo',
      inviato: 'Salvato nel diario ✓',
      su: '↑ Range chiuso! La prossima volta aumenta il carico',
      schede: { ...TESTI_BASE.schede, checkin: 'Diario' },
      solo: { ...TESTI_BASE.solo, notaCoach: 'Appunti di bordo' }
    },
    numGiorno: n => `G${n}`,
    numSerie: n => String(n),
    segnoFatto: '✓'
  }
};

export function tema(id) { return TEMI[id] || TEMI.originale; }

// Le parole da usare: quelle dello stile, con le sostituzioni "da solo" se serve.
export function testiPer(t, solo) {
  return solo ? { ...t.testi, ...t.testi.solo } : t.testi;
}

// Applica uno stile: il CSS fa tutto il resto leggendo data-tema.
export function applicaTema(id) {
  const scelto = TEMI[id] ? id : 'originale';
  document.documentElement.dataset.tema = scelto;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', TEMI[scelto].barra);
}
