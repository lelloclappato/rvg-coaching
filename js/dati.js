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
//   profilo:  { nome, tema, modalita },   ← modalita: 'coach' (con Riccardo) oppure 'solo'
//   esercizi: [ { id, nome, gruppo, video, regolazione } ],   ← regolazione: altezza cavi, sedile… (facoltativa)
//   programma: [ {                      ← una "voce": un esercizio in un giorno di una settimana
//       id, settimana, giorno, nomeGiorno, ordine, esercizioId,
//       notaCoach, notaAtleta,
//       kgProssima,                      ← il peso che ti segni per la settimana dopo (o null)
//       kgScelto, kgPrima,               ← se il carico l'hai deciso tu la settimana prima: quanto, e cosa c'era prima
//       saltato,                         ← true = esercizio saltato in quell'allenamento
//       serie: [ { ripMin, ripMax, rirTarget, kgTarget,   ← il programma (di Riccardo, o tuo se ti alleni da solo)
//                  kg, rip, rir, fatta } ]                 ← quello che hai fatto tu
//   } ],
//   checkin: [ { settimana, data, peso, sonno, energia, stress, dieta, fastidi, note } ],
//   sessioni: [ { settimana, giorno, inizio, fine } ],   ← timer: inizio e fine in millisecondi (fine null = in corso)
//   ultimoBackup: 'AAAA-MM-GG' | null
// }
import { uid, oggi } from './utili.js';
import { settimane } from './calcoli.js';

// Nome sotto cui i dati sono salvati nel browser. Deve essere unico: tutte le app
// pubblicate su lelloclappato.github.io condividono lo stesso localStorage.
export const CHIAVE = 'rvg-coaching-v1';
export const VERSIONE_DATI = 1;
export const TEMI_VALIDI = ['originale', 'inchiostro', 'dark', 'avventura'];
export const MODALITA_VALIDE = ['coach', 'solo'];

function datiVuoti() {
  return {
    versione: VERSIONE_DATI,
    profilo: { nome: '', tema: 'originale', modalita: 'coach' },
    esercizi: [],
    programma: [],
    checkin: [],
    sessioni: [],
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
  if (!MODALITA_VALIDE.includes(profilo.modalita)) profilo.modalita = 'coach';
  return {
    versione: VERSIONE_DATI,
    profilo,
    esercizi: d.esercizi.map(e => ({
      id: e.id || uid(), nome: String(e.nome || 'Esercizio'), video: e.video || '',
      gruppo: String(e.gruppo || '').slice(0, 30),
      regolazione: String(e.regolazione || '').slice(0, 60)
    })),
    programma: d.programma.map(completaVoce),
    checkin: Array.isArray(d.checkin) ? d.checkin : [],
    sessioni: (Array.isArray(d.sessioni) ? d.sessioni : [])
      .filter(x => x && numeroONull(x.inizio) !== null)
      .map(x => ({ settimana: Number(x.settimana) || 1, giorno: Number(x.giorno) || 1, inizio: x.inizio, fine: numeroONull(x.fine) })),
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
    kgProssima: numeroONull(v.kgProssima),
    saltato: !!v.saltato,
    kgScelto: numeroONull(v.kgScelto),
    kgPrima: Array.isArray(v.kgPrima) ? v.kgPrima.map(numeroONull) : null,
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

// Cambia la nota dell'atleta su una voce (per Riccardo, o per te stesso se ti alleni da solo).
export async function salvaNota(voceId, testo) {
  const voce = trovaVoce(voceId);
  if (!voce) return false;
  voce.notaAtleta = String(testo || '').slice(0, 500);
  return salva();
}

// Cambia il programma di una voce (quello che di solito decide Riccardo):
// numero di serie, ripetizioni, RIR, carico e nota del coach.
// Con t.esercizioId si può anche sostituire l'esercizio (solo in questa voce: le altre settimane restano).
// Le serie già registrate restano; se le serie aumentano se ne aggiungono di vuote.
export async function modificaTarget(voceId, t) {
  const voce = trovaVoce(voceId);
  if (!voce) return false;
  if (t.esercizioId && db.esercizi.some(e => e.id === t.esercizioId)) voce.esercizioId = t.esercizioId;
  const quante = Math.max(1, Math.min(12, Math.round(t.serie) || 1));
  const nuove = [];
  for (let i = 0; i < quante; i++) {
    const vecchia = voce.serie[i] || { kg: null, rip: null, rir: null, fatta: false };
    nuove.push({ ...vecchia, ripMin: t.ripMin, ripMax: t.ripMax, rirTarget: t.rirTarget, kgTarget: t.kgTarget });
  }
  voce.serie = nuove;
  voce.notaCoach = String(t.notaCoach || '').slice(0, 500);
  if (voce.kgScelto !== null && t.kgTarget !== voce.kgScelto) { voce.kgScelto = null; voce.kgPrima = null; }
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
      saltato: false,
      // il peso che ti eri segnato per la settimana dopo diventa il carico in programma
      kgProssima: null,
      kgScelto: v.kgProssima,
      kgPrima: v.kgProssima === null ? null : v.serie.map(s => s.kgTarget),
      serie: v.serie.map(s => ({
        ...s, kgTarget: v.kgProssima === null ? s.kgTarget : v.kgProssima,
        kg: null, rip: null, rir: null, fatta: false
      }))
    }));
  db.programma.push(...copie);
  return salva() ? nuova : null;
}

// Elimina una settimana intera (serve se "Nuova settimana" è stata toccata per sbaglio).
export async function eliminaSettimana(settimana) {
  db.programma = db.programma.filter(v => v.settimana !== settimana);
  db.sessioni = db.sessioni.filter(x => x.settimana !== settimana);
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
  if (modifiche.modalita && !MODALITA_VALIDE.includes(modifiche.modalita)) delete modifiche.modalita;
  Object.assign(db.profilo, modifiche);
  return salva();
}

// ---------- editor della scheda (per chi si allena da solo, ma funziona sempre) ----------


// Aggiunge un esercizio in fondo a un giorno. Se il giorno non esiste ancora, lo crea
// (un giorno esiste finché contiene almeno un esercizio). Restituisce l'id della voce (o null).
// v = { settimana, giorno, nomeGiorno, esercizioId, serie, ripMin, ripMax, rirTarget, kgTarget, notaCoach }
export async function aggiungiVoce(v) {
  if (!db.esercizi.some(e => e.id === v.esercizioId)) return null;
  const stessoGiorno = db.programma.filter(x => x.settimana === v.settimana && x.giorno === v.giorno);
  const nomeGiorno = String(v.nomeGiorno || (stessoGiorno[0] && stessoGiorno[0].nomeGiorno) || `Giorno ${v.giorno}`).slice(0, 30);
  const quante = Math.max(1, Math.min(12, Math.round(v.serie) || 1));
  const voce = {
    id: uid(), settimana: v.settimana, giorno: v.giorno, nomeGiorno,
    ordine: stessoGiorno.reduce((m, x) => Math.max(m, x.ordine), -1) + 1,
    esercizioId: v.esercizioId, notaCoach: String(v.notaCoach || '').slice(0, 500), notaAtleta: '',
    serie: Array.from({ length: quante }, () => ({
      ripMin: v.ripMin, ripMax: v.ripMax, rirTarget: v.rirTarget, kgTarget: v.kgTarget,
      kg: null, rip: null, rir: null, fatta: false
    }))
  };
  db.programma.push(voce);
  return salva() ? voce.id : null;
}

// Toglie un esercizio da un giorno (le altre settimane non cambiano).
export async function eliminaVoce(voceId) {
  const prima = db.programma.length;
  db.programma = db.programma.filter(v => v.id !== voceId);
  return db.programma.length < prima && salva();
}

// Sposta un esercizio di un posto in su (-1) o in giù (+1) nel suo giorno.
export async function spostaVoce(voceId, direzione) {
  const voce = trovaVoce(voceId);
  if (!voce) return false;
  const giorno = db.programma
    .filter(v => v.settimana === voce.settimana && v.giorno === voce.giorno)
    .sort((a, b) => a.ordine - b.ordine);
  const i = giorno.indexOf(voce), j = i + direzione;
  if (j < 0 || j >= giorno.length) return false;
  [giorno[i], giorno[j]] = [giorno[j], giorno[i]];
  giorno.forEach((v, k) => { v.ordine = k; }); // rinumera: niente buchi né doppioni
  return salva();
}

// Cambia il nome di un giorno in una settimana (es. "Upper 1" → "Petto e spalle").
export async function rinominaGiorno(settimana, giorno, nome) {
  const pulito = String(nome || '').trim().slice(0, 30);
  if (!pulito) return false;
  const voci = db.programma.filter(v => v.settimana === settimana && v.giorno === giorno);
  if (!voci.length) return false;
  voci.forEach(v => { v.nomeGiorno = pulito; });
  return salva();
}

// Elimina un giorno intero da una settimana.
export async function eliminaGiorno(settimana, giorno) {
  const prima = db.programma.length;
  db.programma = db.programma.filter(v => !(v.settimana === settimana && v.giorno === giorno));
  db.sessioni = db.sessioni.filter(x => !(x.settimana === settimana && x.giorno === giorno));
  return db.programma.length < prima && salva();
}

// ---------- lista degli esercizi ----------

const pulisciNome = nome => String(nome || '').replace(/\s+/g, ' ').trim().slice(0, 60);
const stessoNome = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Quante voci della scheda usano un esercizio.
export function usiEsercizio(esercizioId) {
  return db.programma.filter(v => v.esercizioId === esercizioId).length;
}

// Crea un esercizio nuovo nella lista. Restituisce { ok, id, messaggio }.
export async function creaEsercizio({ nome, gruppo = '', regolazione = '' }) {
  const pulito = pulisciNome(nome);
  if (!pulito) return { ok: false, id: null, messaggio: "Scrivi il nome dell'esercizio." };
  const doppio = db.esercizi.find(e => stessoNome(e.nome, pulito));
  if (doppio) return { ok: false, id: doppio.id, messaggio: `"${doppio.nome}" c'è già nella lista.` };
  const nuovo = { id: uid(), nome: pulito, gruppo: String(gruppo || '').trim().slice(0, 30), video: '', regolazione: String(regolazione || '').trim().slice(0, 60) };
  db.esercizi.push(nuovo);
  return salva() ? { ok: true, id: nuovo.id, messaggio: `${pulito} aggiunto alla lista.` } : { ok: false, id: null, messaggio: 'Non sono riuscito a salvare.' };
}

// Cambia nome, gruppo o regolazione di un esercizio (vale in tutte le settimane).
export async function aggiornaEsercizio(esercizioId, { nome, gruppo, regolazione }) {
  const esercizio = db.esercizi.find(e => e.id === esercizioId);
  if (!esercizio) return { ok: false, messaggio: 'Esercizio non trovato.' };
  const pulito = pulisciNome(nome);
  if (!pulito) return { ok: false, messaggio: "Scrivi il nome dell'esercizio." };
  if (db.esercizi.some(e => e.id !== esercizioId && stessoNome(e.nome, pulito))) {
    return { ok: false, messaggio: `C'è già un esercizio che si chiama "${pulito}".` };
  }
  esercizio.nome = pulito;
  if (gruppo !== undefined) esercizio.gruppo = String(gruppo || '').trim().slice(0, 30);
  if (regolazione !== undefined) esercizio.regolazione = String(regolazione || '').trim().slice(0, 60);
  return salva() ? { ok: true, messaggio: 'Esercizio salvato.' } : { ok: false, messaggio: 'Non sono riuscito a salvare.' };
}

// Toglie un esercizio dalla lista, solo se non è usato nella scheda (così non si perde lo storico).
export async function eliminaEsercizio(esercizioId) {
  if (usiEsercizio(esercizioId) > 0) return false;
  const prima = db.esercizi.length;
  db.esercizi = db.esercizi.filter(e => e.id !== esercizioId);
  return db.esercizi.length < prima && salva();
}

// ---------- saltare un esercizio ----------

// Salta (o non salta più) un esercizio in un allenamento. Le serie già fatte restano registrate.
export async function saltaVoce(voceId, salta = true) {
  const voce = trovaVoce(voceId);
  if (!voce) return false;
  voce.saltato = !!salta;
  return salva();
}

// ---------- regolazione del macchinario ----------

// Altezza dei cavi, posizione del sedile… Sta sull'esercizio, quindi la ritrovi ogni settimana.
export async function salvaRegolazione(esercizioId, testo) {
  const esercizio = db.esercizi.find(e => e.id === esercizioId);
  if (!esercizio) return false;
  esercizio.regolazione = String(testo || '').slice(0, 60);
  return salva();
}

// ---------- peso per la settimana prossima ----------

// La voce "gemella" nella settimana dopo: stesso giorno, stesso esercizio
// (se l'esercizio compare due volte nel giorno, conta quale delle due è).
export function voceSuccessiva(voce) {
  const stesso = (s) => db.programma
    .filter(v => v.settimana === s && v.giorno === voce.giorno && v.esercizioId === voce.esercizioId)
    .sort((a, b) => a.ordine - b.ordine);
  const posto = stesso(voce.settimana).indexOf(voce);
  return stesso(voce.settimana + 1)[posto] || null;
}

// Segna il peso da provare la settimana dopo (kg = null per toglierlo).
// Se la settimana dopo esiste già, il carico in programma cambia subito;
// altrimenti cambia quando la crei (Profilo → Nuova settimana).
// Restituisce { ok, applicato } (applicato = settimana in cui l'hai già trovato, oppure null).
export async function segnaProssima(voceId, kg) {
  const voce = trovaVoce(voceId);
  if (!voce) return { ok: false, applicato: null };
  voce.kgProssima = kg;
  const dopo = voceSuccessiva(voce);
  if (dopo) {
    if (kg !== null) {
      if (dopo.kgScelto === null) dopo.kgPrima = dopo.serie.map(s => s.kgTarget); // ricorda il carico di prima
      dopo.kgScelto = kg;
      dopo.serie.forEach(s => { s.kgTarget = kg; });
    } else if (dopo.kgScelto !== null) {
      // tolto il peso: torna il carico che c'era prima
      const prima = dopo.kgPrima || [];
      dopo.serie.forEach((s, i) => { if (prima.length) s.kgTarget = i < prima.length ? prima[i] : prima[0]; });
      dopo.kgScelto = null; dopo.kgPrima = null;
    }
  }
  return { ok: salva(), applicato: dopo && kg !== null ? dopo.settimana : null };
}

// ---------- timer dell'allenamento ----------

export function sessione(settimana, giorno) {
  return db.sessioni.find(x => x.settimana === settimana && x.giorno === giorno) || null;
}

// Fa partire il timer (se c'era già, non lo tocca). adesso = millisecondi (Date.now()).
export async function avviaSessione(settimana, giorno, adesso) {
  if (sessione(settimana, giorno)) return true;
  db.sessioni.push({ settimana, giorno, inizio: adesso, fine: null });
  return salva();
}

export async function fermaSessione(settimana, giorno, adesso) {
  const x = sessione(settimana, giorno);
  if (!x || x.fine !== null) return false;
  x.fine = Math.max(adesso, x.inizio);
  return salva();
}

// Riprende un timer fermato per sbaglio: il tempo continua dall'inizio originale.
export async function riprendiSessione(settimana, giorno) {
  const x = sessione(settimana, giorno);
  if (!x || x.fine === null) return false;
  x.fine = null;
  return salva();
}

export async function azzeraSessione(settimana, giorno) {
  const prima = db.sessioni.length;
  db.sessioni = db.sessioni.filter(x => !(x.settimana === settimana && x.giorno === giorno));
  return db.sessioni.length < prima && salva();
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
  db.sessioni = []; // i tempi erano della scheda vecchia
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
