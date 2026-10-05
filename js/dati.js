// IL LIVELLO DEI DATI: l'unico file che sa DOVE sono salvati i dati.
//
// Oggi i dati stanno sul telefono (localStorage), come nelle altre mie app.
// Quando si passerà al database online (Supabase), si riscrive SOLO questo file:
// il resto dell'app continua a chiamare le stesse funzioni (aggiornaSerie, salvaCheckin…)
// senza accorgersi di niente.
//
// Per questo le funzioni che modificano i dati sono "async" (restituiscono una Promise):
// oggi rispondono subito, domani aspetteranno la risposta del server, ma chi le chiama
// scrive già "await aggiornaSerie(...)" in entrambi i casi.
//
// FORMATO DEI DATI (pensato per diventare tabelle del database):
// {
//   versione: 1,
//   profilo:  { nome, tema },
//   esercizi: [ { id, nome, gruppo, video } ],
//   programma: [ {                      ← una "voce": un esercizio in un giorno di una settimana
//       id, settimana, giorno, nomeGiorno, ordine, esercizioId,
//       notaCoach, notaAtleta,
//       serie: [ { ripMin, ripMax, rirTarget, kgTarget,   ← quello che chiede Riccardo
//                  kg, rip, rir, fatta } ]                 ← quello che hai fatto tu
//   } ],
//   checkin: [ { settimana, data, peso, sonno, energia, stress, dieta, fastidi, note } ],
//   ultimoBackup: 'AAAA-MM-GG' | null
// }
import { uid, oggi } from './utili.js';
import { settimane } from './calcoli.js';

// Nome sotto cui i dati sono salvati nel browser. Deve essere unico: tutte le app
// pubblicate su lelloclappato.github.io condividono lo stesso localStorage.
export const CHIAVE = 'rvg-coaching-v1';
export const VERSIONE_DATI = 1;
export const TEMI_VALIDI = ['originale', 'inchiostro', 'dark', 'avventura'];

function datiVuoti() {
  return {
    versione: VERSIONE_DATI,
    profilo: { nome: '', tema: 'originale' },
    esercizi: [],
    programma: [],
    checkin: [],
    ultimoBackup: null
  };
}

// I dati in memoria mentre l'app è aperta. Le viste li leggono con dati().
let db = datiVuoti();

export function dati() { return db; }

// ---------- lettura e scrittura ----------

// Legge i dati salvati. Se non c'è niente (prima apertura) parte da dati vuoti.
export async function carica() {
  let salvati = null;
  try {
    const testo = localStorage.getItem(CHIAVE);
    salvati = testo ? JSON.parse(testo) : null;
  } catch (e) {
    salvati = null; // dati illeggibili: si riparte da vuoto (la copia resta nel browser finché non si salva)
  }
  db = eValido(salvati) ? completa(salvati) : datiVuoti();
  return db;
}

// Scrive i dati nel browser. Restituisce false se non c'è riuscito (es. memoria piena).
function salva() {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(db));
    return true;
  } catch (e) {
    return false;
  }
}

// Controllo minimo: è un oggetto con gli elenchi che ci aspettiamo?
export function eValido(d) {
  return !!d && typeof d === 'object' && Array.isArray(d.programma) && Array.isArray(d.esercizi);
}

// Aggiunge i campi mancanti, così il resto dell'app può darli per scontati.
function completa(d) {
  const base = datiVuoti();
  const profilo = { ...base.profilo, ...(d.profilo || {}) };
  if (!TEMI_VALIDI.includes(profilo.tema)) profilo.tema = 'originale';
  return {
    versione: VERSIONE_DATI,
    profilo,
    esercizi: d.esercizi.map(e => ({ id: e.id || uid(), nome: String(e.nome || 'Esercizio'), gruppo: e.gruppo || '', video: e.video || '' })),
    programma: d.programma.map(completaVoce),
    checkin: Array.isArray(d.checkin) ? d.checkin : [],
    ultimoBackup: d.ultimoBackup || null
  };
}

const numeroONull = x => (typeof x === 'number' && Number.isFinite(x) ? x : null);

function completaVoce(v) {
  return {
    id: v.id || uid(),
    settimana: Number(v.settimana) || 1,
    giorno: Number(v.giorno) || 1,
    nomeGiorno: String(v.nomeGiorno || ''),
    ordine: Number(v.ordine) || 0,
    esercizioId: v.esercizioId,
    notaCoach: String(v.notaCoach || ''),
    notaAtleta: String(v.notaAtleta || ''),
    serie: (Array.isArray(v.serie) ? v.serie : []).map(s => ({
      ripMin: numeroONull(s.ripMin), ripMax: numeroONull(s.ripMax),
      rirTarget: numeroONull(s.rirTarget), kgTarget: numeroONull(s.kgTarget),
      kg: numeroONull(s.kg), rip: numeroONull(s.rip), rir: numeroONull(s.rir),
      fatta: !!s.fatta
    }))
  };
}

function trovaVoce(voceId) {
  return db.programma.find(v => v.id === voceId) || null;
}

// ---------- modifiche (tutte async: vedi spiegazione in cima) ----------

// Cambia una serie: modifiche = { kg, rip, rir, fatta } (solo i campi che cambiano).
export async function aggiornaSerie(voceId, indice, modifiche) {
  const voce = trovaVoce(voceId);
  if (!voce || !voce.serie[indice]) return false;
  Object.assign(voce.serie[indice], modifiche);
  return salva();
}

// Cambia la nota per Riccardo di una voce.
export async function salvaNota(voceId, testo) {
  const voce = trovaVoce(voceId);
  if (!voce) return false;
  voce.notaAtleta = String(testo || '').slice(0, 500);
  return salva();
}

// Cambia il programma di una voce (quello che di solito decide Riccardo):
// numero di serie, ripetizioni, RIR, carico e nota del coach.
// Le serie già registrate restano; se le serie aumentano se ne aggiungono di vuote.
export async function modificaTarget(voceId, t) {
  const voce = trovaVoce(voceId);
  if (!voce) return false;
  const quante = Math.max(1, Math.min(12, Math.round(t.serie) || 1));
  const nuove = [];
  for (let i = 0; i < quante; i++) {
    const vecchia = voce.serie[i] || { kg: null, rip: null, rir: null, fatta: false };
    nuove.push({ ...vecchia, ripMin: t.ripMin, ripMax: t.ripMax, rirTarget: t.rirTarget, kgTarget: t.kgTarget });
  }
  voce.serie = nuove;
  voce.notaCoach = String(t.notaCoach || '').slice(0, 500);
  return salva();
}

// Crea la settimana successiva copiando l'ultima: stessi esercizi e stessi target,
// ma niente di registrato. Restituisce il numero della nuova settimana (o null).
export async function copiaUltimaSettimana() {
  const elenco = settimane(db.programma);
  if (!elenco.length) return null;
  const ultima = elenco[elenco.length - 1];
  const nuova = ultima + 1;
  const copie = db.programma
    .filter(v => v.settimana === ultima)
    .map(v => ({
      ...v,
      id: uid(),
      settimana: nuova,
      notaAtleta: '',
      serie: v.serie.map(s => ({ ...s, kg: null, rip: null, rir: null, fatta: false }))
    }));
  db.programma.push(...copie);
  return salva() ? nuova : null;
}

// Elimina una settimana intera (serve se "Nuova settimana" è stata toccata per sbaglio).
export async function eliminaSettimana(settimana) {
  db.programma = db.programma.filter(v => v.settimana !== settimana);
  return salva();
}

// Salva il check-in di una settimana (uno solo per settimana: il nuovo sostituisce il vecchio).
export async function salvaCheckin(c) {
  const pulito = {
    settimana: Number(c.settimana) || 0,
    data: c.data || oggi(),
    peso: numeroONull(c.peso),
    sonno: numeroONull(c.sonno), energia: numeroONull(c.energia),
    stress: numeroONull(c.stress), dieta: numeroONull(c.dieta),
    fastidi: String(c.fastidi || '').slice(0, 500),
    note: String(c.note || '').slice(0, 500)
  };
  db.checkin = db.checkin.filter(x => x.settimana !== pulito.settimana);
  db.checkin.push(pulito);
  db.checkin.sort((a, b) => a.settimana - b.settimana);
  return salva();
}

export async function salvaProfilo(modifiche) {
  if (modifiche.tema && !TEMI_VALIDI.includes(modifiche.tema)) delete modifiche.tema;
  Object.assign(db.profilo, modifiche);
  return salva();
}

// ---------- scheda: importazione ----------

// Importa una scheda (file JSON con esercizi e programma) al posto di quella attuale.
// Profilo e check-in restano. Restituisce { ok, messaggio }.
export async function importaScheda(scheda) {
  if (!scheda || scheda.formato !== 'rvg-scheda' || !eValido(scheda)) {
    return { ok: false, messaggio: 'Questo file non è una scheda RVG Coaching.' };
  }
  const idEsercizi = new Set(scheda.esercizi.map(e => e.id));
  if (scheda.programma.some(v => !idEsercizi.has(v.esercizioId))) {
    return { ok: false, messaggio: 'La scheda contiene esercizi sconosciuti: il file è incompleto.' };
  }
  const pronta = completa({ ...db, esercizi: scheda.esercizi, programma: scheda.programma });
  db.esercizi = pronta.esercizi;
  db.programma = pronta.programma;
  if (!db.profilo.nome && scheda.nome) db.profilo.nome = String(scheda.nome).slice(0, 40);
  if (!salva()) return { ok: false, messaggio: 'Non sono riuscito a salvare: memoria del browser piena.' };
  return { ok: true, messaggio: `Scheda importata: ${settimane(db.programma).length} settimane.` };
}

// ---------- backup ----------

// Tutti i dati come testo, da salvare in un file.
export async function esportaTutto() {
  db.ultimoBackup = oggi();
  salva();
  return JSON.stringify({ formato: 'rvg-backup', ...db }, null, 1);
}

// Rimette i dati da un file di backup, sostituendo tutto.
export async function ripristina(backup) {
  if (!backup || backup.formato !== 'rvg-backup' || !eValido(backup)) {
    return { ok: false, messaggio: 'Questo file non è un backup di RVG Coaching.' };
  }
  const precedente = db;
  db = completa(backup);
  if (!salva()) { db = precedente; return { ok: false, messaggio: 'Non sono riuscito a salvare: memoria del browser piena.' }; }
  return { ok: true, messaggio: 'Backup ripristinato.' };
}

// Cancella tutto e riparte da zero.
export async function cancellaTutto() {
  db = datiVuoti();
  return salva();
}
