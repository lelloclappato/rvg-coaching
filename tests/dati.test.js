// Prove automatiche dell'archivio (js/dati.js): modalità "da solo" e modifica della scheda.
// Si lanciano dal computer con:  node tests/dati.test.js
// Nel computer non c'è il localStorage del browser: qui sotto ce n'è uno finto, in memoria.
const memoria = new Map();
globalThis.localStorage = {
  getItem: k => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => { memoria.set(k, String(v)); },
  removeItem: k => { memoria.delete(k); }
};

const archivio = await import('../js/dati.js');

let passate = 0;
const fallite = [];
function prova(nome, ottenuto, atteso) {
  const uguali = JSON.stringify(ottenuto) === JSON.stringify(atteso);
  if (uguali) passate++;
  else fallite.push(`${nome}: atteso ${JSON.stringify(atteso)}, ottenuto ${JSON.stringify(ottenuto)}`);
}
const d = () => archivio.dati();
const giorno = (s, g) => d().programma.filter(v => v.settimana === s && v.giorno === g).sort((a, b) => a.ordine - b.ordine);
const nomi = voci => voci.map(v => d().esercizi.find(e => e.id === v.esercizioId).nome);
const salvato = () => JSON.parse(memoria.get(archivio.CHIAVE));

// --- profilo e modalità ---
await archivio.carica();
prova('modalità di partenza: con il coach', d().profilo.modalita, 'coach');
prova('passa a "da solo"', await archivio.salvaProfilo({ modalita: 'solo' }), true);
prova('modalità salvata', salvato().profilo.modalita, 'solo');
await archivio.salvaProfilo({ modalita: 'boh' });
prova('modalità non valida ignorata', d().profilo.modalita, 'solo');
await archivio.carica();
prova('modalità riletta dopo la riapertura', d().profilo.modalita, 'solo');

// --- esercizi per nome ---
const panca = await archivio.esercizioPerNome('Panca piana');
prova('crea un esercizio nuovo', typeof panca, 'string');
prova('riconosce lo stesso nome (maiuscole e spazi)', await archivio.esercizioPerNome('  panca   PIANA '), panca);
prova('nome vuoto: niente esercizio', await archivio.esercizioPerNome('   '), null);
prova('un solo esercizio creato', d().esercizi.length, 1);

// --- scheda da zero: giorno nuovo con il primo esercizio ---
const base = { serie: 3, ripMin: 8, ripMax: 12, rirTarget: 1, kgTarget: 60, notaCoach: '' };
const v1 = await archivio.aggiungiVoce({ ...base, settimana: 1, giorno: 1, nomeGiorno: 'Petto', esercizioId: panca });
prova('aggiunge la prima voce', typeof v1, 'string');
prova('giorno creato con il suo nome', giorno(1, 1)[0].nomeGiorno, 'Petto');
prova('serie create', giorno(1, 1)[0].serie.length, 3);
prova('serie con il programma e vuote', giorno(1, 1)[0].serie[0], { ripMin: 8, ripMax: 12, rirTarget: 1, kgTarget: 60, kg: null, rip: null, rir: null, fatta: false });

const croci = await archivio.esercizioPerNome('Croci ai cavi');
const dip = await archivio.esercizioPerNome('Dip');
const v2 = await archivio.aggiungiVoce({ ...base, settimana: 1, giorno: 1, esercizioId: croci });
const v3 = await archivio.aggiungiVoce({ ...base, settimana: 1, giorno: 1, esercizioId: dip, serie: 99 });
prova('le voci nuove vanno in fondo', nomi(giorno(1, 1)), ['Panca piana', 'Croci ai cavi', 'Dip']);
prova('il nome del giorno viene ripreso', giorno(1, 1)[2].nomeGiorno, 'Petto');
prova('massimo 12 serie', giorno(1, 1)[2].serie.length, 12);
prova('esercizio inesistente rifiutato', await archivio.aggiungiVoce({ ...base, settimana: 1, giorno: 1, esercizioId: 'nessuno' }), null);

// --- spostare ---
prova('sposta su', await archivio.spostaVoce(v3, -1), true);
prova('ordine dopo lo spostamento', nomi(giorno(1, 1)), ['Panca piana', 'Dip', 'Croci ai cavi']);
prova('ordine rinumerato senza buchi', giorno(1, 1).map(v => v.ordine), [0, 1, 2]);
prova('il primo non sale oltre', await archivio.spostaVoce(v1, -1), false);
prova("l'ultimo non scende oltre", await archivio.spostaVoce(v2, 1), false);

// --- modificare e sostituire ---
await archivio.aggiornaSerie(v1, 0, { kg: 62.5, rip: 10, rir: 1, fatta: true });
const rematore = await archivio.esercizioPerNome('Rematore');
prova('modifica il programma', await archivio.modificaTarget(v1, { serie: 4, ripMin: 6, ripMax: 8, rirTarget: 2, kgTarget: 70, notaCoach: 'lento', esercizioId: rematore }), true);
const modificata = d().programma.find(v => v.id === v1);
prova("sostituisce l'esercizio", modificata.esercizioId, rematore);
prova('serie portate a 4', modificata.serie.length, 4);
prova('la serie registrata resta', [modificata.serie[0].kg, modificata.serie[0].fatta], [62.5, true]);
prova('nuovo programma applicato', [modificata.serie[3].ripMin, modificata.serie[3].kgTarget], [6, 70]);
prova('promemoria salvato', modificata.notaCoach, 'lento');
await archivio.modificaTarget(v2, { serie: 3, ripMin: 8, ripMax: 12, rirTarget: 1, kgTarget: 20, notaCoach: '', esercizioId: 'nessuno' });
prova('esercizio inesistente: resta quello di prima', d().programma.find(v => v.id === v2).esercizioId, croci);

// --- giorni ---
await archivio.aggiungiVoce({ ...base, settimana: 1, giorno: 2, nomeGiorno: 'Gambe', esercizioId: await archivio.esercizioPerNome('Squat') });
prova('rinomina giorno', await archivio.rinominaGiorno(1, 1, 'Petto e tricipiti'), true);
prova('tutte le voci rinominate', giorno(1, 1).every(v => v.nomeGiorno === 'Petto e tricipiti'), true);
prova('nome vuoto rifiutato', await archivio.rinominaGiorno(1, 1, '  '), false);
prova('giorno inesistente non si rinomina', await archivio.rinominaGiorno(1, 9, 'X'), false);
prova('elimina voce', await archivio.eliminaVoce(v3), true);
prova('voce tolta', nomi(giorno(1, 1)), ['Rematore', 'Croci ai cavi']);
prova('voce inesistente', await archivio.eliminaVoce('nessuna'), false);
prova('elimina giorno', await archivio.eliminaGiorno(1, 2), true);
prova('giorno tolto, l\'altro resta', [giorno(1, 2).length, giorno(1, 1).length], [0, 2]);

// --- tutto finisce davvero nel localStorage ---
prova('programma salvato', salvato().programma.length, 2);
await archivio.carica();
prova('programma riletto dopo la riapertura', nomi(giorno(1, 1)), ['Rematore', 'Croci ai cavi']);

// --- copia della settimana: la nuova settimana eredita le modifiche ---
prova('nuova settimana', await archivio.copiaUltimaSettimana(), 2);
prova('settimana 2 con gli stessi esercizi', nomi(giorno(2, 1)), ['Rematore', 'Croci ai cavi']);
prova('settimana 2 da registrare', giorno(2, 1).every(v => v.serie.every(s => !s.fatta)), true);

console.log(`${passate} prove passate, ${fallite.length} fallite`);
for (const f of fallite) console.log('  ✗ ' + f);
if (fallite.length && typeof process !== 'undefined') process.exit(1);
