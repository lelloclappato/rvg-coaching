// Come si uniscono le schede tra coach e cliente, senza perdere niente.
//
// Ogni esercizio della scheda (una "voce") ha un codice interno (id) che resta lo stesso
// quando la scheda passa dal coach al cliente e ritorno. Così:
//  - il programma (serie, ripetizioni, carico, note del coach) lo decide il coach
//  - quello che è stato fatto (kg, ripetizioni, RIR, spunte, note, salti) lo decide il cliente
// Sono funzioni "pure": ricevono i dati e restituiscono il risultato, senza salvare niente.

// I campi di una serie che registra il cliente.
const REGISTRATI = ['kg', 'rip', 'rir', 'fatta'];
// I campi di una voce che appartengono al cliente.
const DEL_CLIENTE = ['notaAtleta', 'saltato', 'kgProssima'];

const copia = x => JSON.parse(JSON.stringify(x));
const registrata = voce => voce.serie.some(s => s.fatta || s.kg !== null || s.rip !== null);

// Programma della voce "piano", con quello che è stato fatto preso da "fatto".
function conRegistrazioni(piano, fatto) {
  const voce = copia(piano);
  voce.serie = voce.serie.map((s, i) => {
    const r = fatto.serie[i];
    if (!r) return { ...s, kg: null, rip: null, rir: null, fatta: false };
    const nuova = { ...s };
    for (const k of REGISTRATI) nuova[k] = r[k] ?? (k === 'fatta' ? false : null);
    return nuova;
  });
  // serie in più già fatte dal cliente: non si buttano
  for (let i = voce.serie.length; i < fatto.serie.length; i++) {
    if (fatto.serie[i].fatta) voce.serie.push(copia(fatto.serie[i]));
  }
  for (const k of DEL_CLIENTE) voce[k] = fatto[k] ?? voce[k];
  return voce;
}

// Esercizi: tutti quelli di entrambi; il nome lo decide chi manda il programma (vince "programma"),
// la regolazione del macchinario è del cliente.
function unisciEsercizi(daProgramma, daCliente) {
  const perId = new Map();
  for (const e of daCliente) perId.set(e.id, copia(e));
  for (const e of daProgramma) {
    const vecchio = perId.get(e.id);
    perId.set(e.id, { ...copia(e), regolazione: (vecchio && vecchio.regolazione) || e.regolazione || '' });
  }
  return [...perId.values()];
}

// Il CLIENTE riceve la scheda aggiornata dal coach.
// Restituisce { esercizi, programma, nuove, aggiornate, tolte }.
export function unisciSchedaDalCoach(locale, arrivata) {
  const mie = new Map(locale.programma.map(v => [v.id, v]));
  const idArrivate = new Set(arrivata.programma.map(v => v.id));
  let nuove = 0, aggiornate = 0, tolte = 0;
  const programma = arrivata.programma.map(v => {
    const mia = mie.get(v.id);
    if (!mia) { nuove++; return copia(v); }
    aggiornate++;
    return conRegistrazioni(v, mia);
  });
  // voci che il coach ha tolto: restano solo se c'è già qualcosa di fatto
  for (const v of locale.programma) {
    if (idArrivate.has(v.id)) continue;
    if (registrata(v)) programma.push(copia(v)); else tolte++;
  }
  return { esercizi: unisciEsercizi(arrivata.esercizi, locale.esercizi), programma, nuove, aggiornate, tolte };
}

// Il COACH riceve i dati del cliente (il file "Manda i miei dati al coach").
// Restituisce { esercizi, programma, checkin, serieNuove }.
export function unisciDatiDelCliente(delCoach, arrivati) {
  const loro = new Map(arrivati.programma.map(v => [v.id, v]));
  const idCoach = new Set(delCoach.programma.map(v => v.id));
  const contaFatte = p => p.reduce((n, v) => n + v.serie.filter(s => s.fatta).length, 0);
  const prima = contaFatte(delCoach.programma);
  const programma = delCoach.programma.map(v => (loro.has(v.id) ? conRegistrazioni(v, loro.get(v.id)) : copia(v)));
  // voci che il coach non conosce (es. il cliente le ha aggiunte da solo): si tengono
  for (const v of arrivati.programma) if (!idCoach.has(v.id)) programma.push(copia(v));
  return {
    esercizi: unisciEsercizi(delCoach.esercizi, arrivati.esercizi),
    programma,
    checkin: copia(arrivati.checkin || []),
    serieNuove: Math.max(0, contaFatte(programma) - prima)
  };
}

// Quante voci hanno lo stesso codice: se ce n'è almeno una, è un aggiornamento della stessa scheda.
export function stessaScheda(a, b) {
  const ids = new Set(a.map(v => v.id));
  return b.some(v => ids.has(v.id));
}
