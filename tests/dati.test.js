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
const crea = async nome => (await archivio.creaEsercizio({ nome })).id;
const panca = await crea('Panca piana');
prova('crea un esercizio nuovo', typeof panca, 'string');
prova('stesso nome (maiuscole e spazi): rifiutato e indica quello esistente', await archivio.creaEsercizio({ nome: '  panca   PIANA ' }), { ok: false, id: panca, messaggio: '"Panca piana" c\'è già nella lista.' });
prova('nome vuoto: niente esercizio', (await archivio.creaEsercizio({ nome: '   ' })).ok, false);
prova('un solo esercizio creato', d().esercizi.length, 1);

// --- scheda da zero: giorno nuovo con il primo esercizio ---
const base = { serie: 3, ripMin: 8, ripMax: 12, rirTarget: 1, kgTarget: 60, notaCoach: '' };
const v1 = await archivio.aggiungiVoce({ ...base, settimana: 1, giorno: 1, nomeGiorno: 'Petto', esercizioId: panca });
prova('aggiunge la prima voce', typeof v1, 'string');
prova('giorno creato con il suo nome', giorno(1, 1)[0].nomeGiorno, 'Petto');
prova('serie create', giorno(1, 1)[0].serie.length, 3);
prova('serie con il programma e vuote', giorno(1, 1)[0].serie[0], { ripMin: 8, ripMax: 12, rirTarget: 1, kgTarget: 60, kg: null, rip: null, rir: null, fatta: false });

const croci = await crea('Croci ai cavi');
const dip = await crea('Dip');
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
const rematore = await crea('Rematore');
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
await archivio.aggiungiVoce({ ...base, settimana: 1, giorno: 2, nomeGiorno: 'Gambe', esercizioId: await crea('Squat') });
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

// --- regolazione del macchinario ---
const croci2 = giorno(2, 1)[1];
prova('regolazione salvata', await archivio.salvaRegolazione(croci2.esercizioId, 'cavi al 7, sedile 4'), true);
prova("regolazione sull'esercizio (vale per tutte le settimane)", d().esercizi.find(e => e.id === giorno(1, 1)[1].esercizioId).regolazione, 'cavi al 7, sedile 4');
prova('regolazione tagliata a 60 caratteri', (await archivio.salvaRegolazione(croci2.esercizioId, 'x'.repeat(80)), d().esercizi.find(e => e.id === croci2.esercizioId).regolazione.length), 60);
await archivio.salvaRegolazione(croci2.esercizioId, 'cavi al 7');
prova('esercizio inesistente', await archivio.salvaRegolazione('nessuno', 'x'), false);
await archivio.carica();
prova('regolazione riletta', d().esercizi.find(e => e.id === croci2.esercizioId).regolazione, 'cavi al 7');

// --- peso per la settimana prossima: la settimana dopo c'è già (1 → 2) ---
const rem1 = giorno(1, 1)[0], rem2 = giorno(2, 1)[0];
prova('carico di partenza in settimana 2', rem2.serie.map(s => s.kgTarget), [70, 70, 70, 70]);
let esito = await archivio.segnaProssima(rem1.id, 72.5);
prova('segnato e applicato subito', esito, { ok: true, applicato: 2 });
prova('settimana 2 aggiornata', giorno(2, 1)[0].serie.map(s => s.kgTarget), [72.5, 72.5, 72.5, 72.5]);
prova('settimana 2 sa che l\'hai deciso tu', giorno(2, 1)[0].kgScelto, 72.5);
await archivio.segnaProssima(rem1.id, 75);
prova('cambiato idea: vale l\'ultimo', giorno(2, 1)[0].serie[0].kgTarget, 75);
prova('il carico originale resta quello vero', giorno(2, 1)[0].kgPrima, [70, 70, 70, 70]);
esito = await archivio.segnaProssima(rem1.id, null);
prova('tolto il peso: torna il carico di prima', [esito.applicato, giorno(2, 1)[0].serie.map(s => s.kgTarget), giorno(2, 1)[0].kgScelto], [null, [70, 70, 70, 70], null]);

// --- peso per la settimana prossima: la settimana dopo non c'è ancora (2 → 3) ---
esito = await archivio.segnaProssima(giorno(2, 1)[0].id, 77.5);
prova('settimana 3 non esiste: aspetta', esito, { ok: true, applicato: null });
await archivio.carica();
prova('peso segnato riletto', giorno(2, 1)[0].kgProssima, 77.5);
prova('nuova settimana 3', await archivio.copiaUltimaSettimana(), 3);
prova('settimana 3 parte dal peso segnato', giorno(3, 1)[0].serie.map(s => s.kgTarget), [77.5, 77.5, 77.5, 77.5]);
prova('settimana 3: deciso da te', giorno(3, 1)[0].kgScelto, 77.5);
prova('settimana 3: senza peso segnato, carico uguale', giorno(3, 1)[1].serie[0].kgTarget, giorno(2, 1)[1].serie[0].kgTarget);
prova('la copia non si porta dietro il peso segnato', giorno(3, 1)[0].kgProssima, null);
await archivio.modificaTarget(giorno(3, 1)[0].id, { serie: 4, ripMin: 6, ripMax: 8, rirTarget: 2, kgTarget: 80, notaCoach: '' });
prova('carico rimesso a mano: non è più "deciso da te"', [giorno(3, 1)[0].kgScelto, giorno(3, 1)[0].serie[0].kgTarget], [null, 80]);

// --- timer dell'allenamento ---
prova('nessun timer', archivio.sessione(3, 1), null);
prova('avvia', await archivio.avviaSessione(3, 1, 1000000), true);
await archivio.avviaSessione(3, 1, 5000000);
prova('avviare due volte non lo fa ripartire', archivio.sessione(3, 1).inizio, 1000000);
prova('ferma', await archivio.fermaSessione(3, 1, 4600000), true);
prova('durata', archivio.sessione(3, 1).fine - archivio.sessione(3, 1).inizio, 3600000);
prova('fermare due volte no', await archivio.fermaSessione(3, 1, 9000000), false);
prova('riprendi', [await archivio.riprendiSessione(3, 1), archivio.sessione(3, 1).fine], [true, null]);
await archivio.fermaSessione(3, 1, 500); // orologio del telefono indietro: niente durate negative
prova('fine mai prima dell\'inizio', archivio.sessione(3, 1).fine, 1000000);
await archivio.carica();
prova('timer riletto', archivio.sessione(3, 1), { settimana: 3, giorno: 1, inizio: 1000000, fine: 1000000 });
prova('azzera', [await archivio.azzeraSessione(3, 1), archivio.sessione(3, 1)], [true, null]);
await archivio.avviaSessione(3, 1, 1);
await archivio.eliminaSettimana(3);
prova('eliminando la settimana sparisce anche il timer', archivio.sessione(3, 1), null);

// --- lista degli esercizi ---
const nuovoEs = await archivio.creaEsercizio({ nome: 'Chest fly macchinario', gruppo: 'Petto', regolazione: 'sedile 4' });
prova('crea con gruppo e regolazione', [nuovoEs.ok, d().esercizi.find(e => e.id === nuovoEs.id).gruppo, d().esercizi.find(e => e.id === nuovoEs.id).regolazione], [true, 'Petto', 'sedile 4']);
prova('non usato nella scheda', archivio.usiEsercizio(nuovoEs.id), 0);
prova('rinomina', (await archivio.aggiornaEsercizio(nuovoEs.id, { nome: 'Chest fly', gruppo: 'Petto' })).ok, true);
prova('nome nuovo salvato', d().esercizi.find(e => e.id === nuovoEs.id).nome, 'Chest fly');
prova('rinomina con un nome già usato: no', (await archivio.aggiornaEsercizio(nuovoEs.id, { nome: 'panca piana' })).ok, false);
prova('rinomina con nome vuoto: no', (await archivio.aggiornaEsercizio(nuovoEs.id, { nome: ' ' })).ok, false);
prova('stesso nome con maiuscole diverse ok (è lui)', (await archivio.aggiornaEsercizio(nuovoEs.id, { nome: 'CHEST FLY' })).ok, true);
prova('elimina se non usato', await archivio.eliminaEsercizio(nuovoEs.id), true);
prova('tolto dalla lista', d().esercizi.some(e => e.id === nuovoEs.id), false);
const usato = giorno(1, 1)[0].esercizioId;
prova('usato nella scheda: quante volte', archivio.usiEsercizio(usato) >= 1, true);
prova('usato nella scheda: non si elimina', await archivio.eliminaEsercizio(usato), false);
const nomeUsato = d().esercizi.find(e => e.id === usato).nome;
await archivio.aggiornaEsercizio(usato, { nome: 'Rematore con bilanciere' });
prova('rinomina vale in tutte le settimane', nomi(giorno(1, 1))[0], 'Rematore con bilanciere');
await archivio.aggiornaEsercizio(usato, { nome: nomeUsato });

// --- saltare un esercizio ---
const daSaltare = giorno(1, 1)[1];
prova('salta', await archivio.saltaVoce(daSaltare.id, true), true);
await archivio.carica();
prova('saltato riletto', giorno(1, 1)[1].saltato, true);
prova('non saltarlo più', [await archivio.saltaVoce(daSaltare.id, false), giorno(1, 1)[1].saltato], [true, false]);
await archivio.saltaVoce(daSaltare.id, true);
const nuova = await archivio.copiaUltimaSettimana();
prova('la settimana copiata riparte senza salti', giorno(nuova, 1).every(v => v.saltato === false), true);
prova('voce inesistente', await archivio.saltaVoce('nessuna'), false);

// --- dati vecchi (v0.2) senza i campi nuovi ---
memoria.set(archivio.CHIAVE, JSON.stringify({ versione: 1, profilo: {}, esercizi: [{ id: 'a', nome: 'A' }], programma: [{ id: 'v', settimana: 1, giorno: 1, esercizioId: 'a', serie: [{ kgTarget: 50 }] }] }));
await archivio.carica();
prova('dati vecchi: campi nuovi vuoti', [d().esercizi[0].regolazione, d().esercizi[0].gruppo, d().programma[0].kgProssima, d().programma[0].kgScelto, d().programma[0].saltato, d().sessioni], ['', '', null, null, false, []]);

console.log(`${passate} prove passate, ${fallite.length} fallite`);
for (const f of fallite) console.log('  ✗ ' + f);
if (fallite.length && typeof process !== 'undefined') process.exit(1);
