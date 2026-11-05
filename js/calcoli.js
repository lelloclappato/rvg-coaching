// Tutti i calcoli dell'app: forza stimata, volume, avanzamento, suggerimenti.
// Sono funzioni "pure": ricevono dei dati e restituiscono un risultato, senza toccare
// né lo schermo né il salvataggio. Per questo si possono provare da sole (cartella tests/).
//
// Parole usate qui:
//  - "voce"  = un esercizio dentro un giorno di una settimana (es. Panca piana, settimana 37, giorno 1)
//  - "serie" = una riga della voce: quello che Riccardo chiede (target) e quello che hai fatto

// Massimale stimato (e1RM) con la formula di Epley, corretta con il RIR:
// le ripetizioni "lasciate in riserva" contano come se le avessi fatte.
// Esempio: 95 kg × 4 con RIR 2 → 95 × (1 + 6/30) = 114 kg.
export function e1rm(kg, rip, rir = 0) {
  if (!(kg > 0) || !(rip > 0)) return null;
  return kg * (1 + (rip + (rir > 0 ? rir : 0)) / 30);
}

// Valori "effettivi" di una serie: quello che hai registrato, oppure, se non hai
// scritto niente, quello che era in programma.
export function effettivi(serie) {
  return {
    kg: serie.kg ?? serie.kgTarget ?? null,
    rip: serie.rip ?? serie.ripMin ?? null,
    rir: serie.rir ?? serie.rirTarget ?? 0
  };
}

// e1RM di una serie. Una serie fallita (0 ripetizioni) non conta.
export function e1rmSerie(serie) {
  if (serie.fatta && serie.rip === 0) return null;
  const v = effettivi(serie);
  return e1rm(v.kg, v.rip, v.rir);
}

// Volume di una serie: kg × ripetizioni.
export function volumeSerie(serie) {
  const v = effettivi(serie);
  return v.kg > 0 && v.rip > 0 ? v.kg * v.rip : 0;
}

// Quante serie fatte su quante in totale, per un elenco di voci.
export function avanzamento(voci) {
  let fatte = 0, totali = 0;
  for (const voce of voci) for (const s of voce.serie) { totali++; if (s.fatta) fatte++; }
  return { fatte, totali };
}

// Doppia progressione: vale solo per gli esercizi "a range" (es. 6-10 ripetizioni).
//  - 'su'  = in almeno una serie sei arrivato in cima al range → la prossima volta più carico
//  - 'giu' = in almeno una serie sei rimasto sotto il minimo → resta su questo carico
//  - null  = niente da dire
export function suggerimento(voce) {
  let su = false, giu = false;
  for (const s of voce.serie) {
    if (!s.fatta || s.rip === null || s.rip === undefined) continue;
    if (!(s.ripMax > s.ripMin)) continue;
    if (s.rip >= s.ripMax) su = true;
    if (s.rip < s.ripMin) giu = true;
  }
  return su ? 'su' : giu ? 'giu' : null;
}

// Elenco delle settimane presenti nel programma, in ordine crescente.
export function settimane(programma) {
  return [...new Set(programma.map(v => v.settimana))].sort((a, b) => a - b);
}

// Le voci di un giorno, nell'ordine della scheda.
export function vociDelGiorno(programma, settimana, giorno) {
  return programma
    .filter(v => v.settimana === settimana && v.giorno === giorno)
    .sort((a, b) => a.ordine - b.ordine);
}

// I giorni di una settimana, ognuno con il suo avanzamento.
export function giorniDellaSettimana(programma, settimana) {
  const mappa = new Map();
  for (const v of programma) {
    if (v.settimana !== settimana) continue;
    if (!mappa.has(v.giorno)) mappa.set(v.giorno, { giorno: v.giorno, nome: v.nomeGiorno, voci: [] });
    mappa.get(v.giorno).voci.push(v);
  }
  return [...mappa.values()]
    .sort((a, b) => a.giorno - b.giorno)
    .map(g => {
      const av = avanzamento(g.voci);
      return { giorno: g.giorno, nome: g.nome, esercizi: g.voci.length, ...av, completo: av.totali > 0 && av.fatte === av.totali };
    });
}

// Il giorno da proporre in "Oggi": il primo non ancora completato, altrimenti l'ultimo.
export function prossimoGiorno(programma, settimana) {
  const giorni = giorniDellaSettimana(programma, settimana);
  if (!giorni.length) return null;
  return (giorni.find(g => !g.completo) || giorni[giorni.length - 1]).giorno;
}

// Storia di un esercizio settimana per settimana: miglior e1RM, volume totale,
// e quante serie erano davvero registrate (le altre usano il carico in programma).
export function storicoEsercizio(programma, esercizioId) {
  const perSettimana = new Map();
  for (const voce of programma) {
    if (voce.esercizioId !== esercizioId) continue;
    if (!perSettimana.has(voce.settimana)) {
      perSettimana.set(voce.settimana, { settimana: voce.settimana, e1rm: null, volume: 0, registrate: 0, serie: 0, descrizione: '' });
    }
    const riga = perSettimana.get(voce.settimana);
    for (const s of voce.serie) {
      riga.serie++;
      if (s.fatta) riga.registrate++;
      riga.volume += volumeSerie(s);
      const stima = e1rmSerie(s);
      if (stima !== null && (riga.e1rm === null || stima > riga.e1rm)) riga.e1rm = stima;
    }
    if (!riga.descrizione) riga.descrizione = descriviVoce(voce);
  }
  return [...perSettimana.values()].sort((a, b) => a.settimana - b.settimana);
}

// "5×4 · 95 kg" oppure "2×6-10 · 14 kg · RIR 1"
export function descriviVoce(voce) {
  const s = voce.serie[0];
  if (!s) return '';
  const rip = s.ripMin === null || s.ripMin === undefined ? ''
    : s.ripMax > s.ripMin ? `${s.ripMin}-${s.ripMax}` : `${s.ripMin}`;
  const parti = [rip ? `${voce.serie.length}×${rip}` : `${voce.serie.length} serie`];
  const kg = s.kgTarget ?? s.kg;
  if (kg !== null && kg !== undefined) parti.push(`${String(kg).replace('.', ',')} kg`);
  if (s.rirTarget !== null && s.rirTarget !== undefined && s.ripMax > s.ripMin) parti.push(`RIR ${String(s.rirTarget).replace('.', ',')}`);
  return parti.join(' · ');
}

// Quante volte compare ogni esercizio: serve per proporre per primi i più usati.
export function eserciziPerFrequenza(programma) {
  const conteggio = new Map();
  for (const v of programma) conteggio.set(v.esercizioId, (conteggio.get(v.esercizioId) || 0) + 1);
  return [...conteggio.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

// Testo riassuntivo di un allenamento, da mandare a Riccardo (es. su WhatsApp).
// Durata in millisecondi → orologio: 754000 → "12:34", 3925000 → "1:05:25".
export function orologio(ms) {
  const totale = Math.max(0, Math.floor((ms || 0) / 1000));
  const ore = Math.floor(totale / 3600), min = Math.floor((totale % 3600) / 60), sec = totale % 60;
  const due = x => String(x).padStart(2, '0');
  return ore ? `${ore}:${due(min)}:${due(sec)}` : `${min}:${due(sec)}`;
}

// Durata in millisecondi → a parole: 3925000 → "1 h 05 min", 754000 → "12 min".
export function durataBreve(ms) {
  const minuti = Math.max(0, Math.round((ms || 0) / 60000));
  const ore = Math.floor(minuti / 60), resto = minuti % 60;
  return ore ? `${ore} h ${String(resto).padStart(2, '0')} min` : `${resto} min`;
}

// Testo da mandare (WhatsApp…) con l'allenamento del giorno. durataMs è facoltativa.
export function riepilogoGiorno(voci, nomiEsercizi, settimana, durataMs = null) {
  if (!voci.length) return '';
  const righe = [`Settimana ${settimana} · Giorno ${voci[0].giorno} ${voci[0].nomeGiorno}`];
  if (durataMs !== null && durataMs > 0) righe.push(`Durata: ${durataBreve(durataMs)}`);
  for (const voce of voci) {
    const fatte = voce.serie.filter(s => s.fatta);
    const serie = fatte.map(s => {
      const v = effettivi(s);
      const rir = s.rir !== null && s.rir !== undefined ? ` (RIR ${String(s.rir).replace('.', ',')})` : '';
      return `${String(v.kg ?? '?').replace('.', ',')}×${v.rip ?? '?'}${rir}`;
    }).join(', ');
    righe.push(`- ${nomiEsercizi[voce.esercizioId] || 'Esercizio'}: ${serie || 'non fatto'}`);
    if (voce.notaAtleta) righe.push(`  nota: ${voce.notaAtleta}`);
  }
  return righe.join('\n');
}
