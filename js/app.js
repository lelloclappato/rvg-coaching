// Punto di partenza dell'app: carica i dati, disegna la schermata e ascolta tocchi e scritture.
//
// Come funziona, in breve:
//  1. ogni schermata è una funzione (in js/viste/) che restituisce dell'HTML come testo
//  2. disegna() mette quell'HTML nella pagina
//  3. bottoni e campi hanno attributi "data-azione" / "data-campo": un solo ascoltatore
//     per tutta la pagina guarda quale è stato toccato e decide cosa fare
import * as archivio from './dati.js';
import { stato } from './stato.js';
import { applicaTema, tema } from './temi.js';
import { icone } from './icone.js';
import { numero, esc, oggi } from './utili.js';
import { avanzamento, vociDelGiorno, riepilogoGiorno } from './calcoli.js';
import { schedaDiEsempio } from './esempio.js';
import { contesto } from './viste/comune.js';
import { vistaOggi } from './viste/oggi.js';
import { vistaAllenamento, giornoAperto, htmlIndicatore, htmlRiassunto, htmlSuggerimento, htmlModifica, htmlAggiungi, htmlRinomina } from './viste/allenamento.js';
import { vistaProgressi } from './viste/progressi.js';
import { vistaCheckin, bozza, riepilogoCheckin } from './viste/checkin.js';
import { vistaProfilo } from './viste/profilo.js';
import { apriModale, chiudiModale, conferma } from './viste/modale.js';
import { avviaPwa } from './pwa.js';

const VISTE = { oggi: vistaOggi, allenamento: vistaAllenamento, progressi: vistaProgressi, checkin: vistaCheckin, profilo: vistaProfilo };
const $ = selettore => document.querySelector(selettore);

// ---------- disegno ----------

function disegnaSchede() {
  const t = tema(archivio.dati().profilo.tema);
  $('#schede').innerHTML = Object.keys(VISTE).map(id =>
    `<button class="tab ${stato.scheda === id ? 'attiva' : ''}" data-azione="vai" data-scheda="${id}" ${stato.scheda === id ? 'aria-current="page"' : ''}>
      ${icone[id]}<span>${esc(t.testi.schede[id])}</span></button>`).join('');
}

// Ridisegna la schermata. Dopo aver sostituito l'HTML rimette il "fuoco" (il cursore
// della tastiera) sul bottone che era stato toccato, così chi usa la tastiera non si perde.
function disegna({ inAlto = false } = {}) {
  const attivo = document.activeElement;
  const chiave = attivo && attivo.dataset && attivo.dataset.azione
    ? `[data-azione="${attivo.dataset.azione}"]` +
      (attivo.dataset.voce ? `[data-voce="${attivo.dataset.voce}"]` : '') +
      (attivo.dataset.serie ? `[data-serie="${attivo.dataset.serie}"]` : '') +
      (attivo.dataset.voto ? `[data-campo="${attivo.dataset.campo}"][data-voto="${attivo.dataset.voto}"]` : '') +
      (attivo.dataset.temaScelto ? `[data-tema-scelto="${attivo.dataset.temaScelto}"]` : '') +
      (attivo.dataset.giorno ? `[data-giorno="${attivo.dataset.giorno}"]` : '') +
      (attivo.dataset.scheda ? `[data-scheda="${attivo.dataset.scheda}"]` : '')
    : null;
  const scorrimento = window.scrollY;
  const app = $('#app');
  app.dataset.vista = stato.scheda;
  app.innerHTML = VISTE[stato.scheda]();
  disegnaSchede();
  window.scrollTo(0, inAlto ? 0 : scorrimento);
  if (chiave) { const stesso = document.querySelector(chiave); if (stesso) stesso.focus({ preventScroll: true }); }
}

let timerAvviso = null;
function avviso(testo, azione = null) {
  const el = $('#avviso');
  el.innerHTML = `<span>${esc(testo)}</span>` + (azione ? `<button class="bottone piccolo" data-azione="${azione.azione}">${esc(azione.etichetta)}</button>` : '');
  el.classList.add('visibile');
  clearTimeout(timerAvviso);
  if (!azione) timerAvviso = setTimeout(() => el.classList.remove('visibile'), 3500);
}

// ---------- condivisione e file ----------

// Manda un testo ad altre app (WhatsApp…). Se il telefono non lo permette, lo copia.
async function condividi(testo) {
  try {
    if (navigator.share) { await navigator.share({ text: testo }); return; }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // l'utente ha chiuso il pannello: non è un errore
  }
  try {
    await navigator.clipboard.writeText(testo);
    avviso(contesto().solo ? 'Copiato: ora puoi incollarlo dove vuoi.' : 'Copiato: ora incollalo nella chat con Riccardo.');
  } catch (e) {
    await apriModale(`<h2>Riepilogo</h2><textarea class="campo testo" rows="10" readonly>${esc(testo)}</textarea>
      <div class="riga-bottoni"><button class="bottone primario" data-azione="chiudi-modale">Chiudi</button></div>`);
  }
}

function scarica(nomeFile, testo) {
  const url = URL.createObjectURL(new Blob([testo], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = nomeFile;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let fileAtteso = null; // 'scheda' oppure 'backup': cosa stiamo per leggere dal file scelto
function scegliFile(tipo) { fileAtteso = tipo; const campo = $('#scegliFile'); campo.value = ''; campo.click(); }

async function leggiFile(file) {
  let contenuto;
  try { contenuto = JSON.parse(await file.text()); }
  catch (e) { avviso('Non riesco a leggere questo file: non è un file .json valido.'); return; }
  const esito = fileAtteso === 'backup' ? await archivio.ripristina(contenuto) : await archivio.importaScheda(contenuto);
  if (esito.ok) {
    stato.settimana = null; stato.giorno = null; stato.voceAperta = null; stato.bozzaCheckin = null;
    applicaTema(archivio.dati().profilo.tema);
    stato.scheda = fileAtteso === 'backup' ? 'profilo' : 'oggi';
    disegna({ inAlto: true });
  }
  avviso(esito.messaggio);
}

// ---------- azioni (tocchi) ----------

const errore = () => avviso('Non sono riuscito a salvare. Libera spazio sul telefono e riprova.');

function apriGiorno(giorno) {
  const c = contesto();
  if (stato.scheda !== 'allenamento') stato.settimana = c.ultima;
  stato.giorno = giorno;
  const { settimana } = giornoAperto(c);
  const voci = vociDelGiorno(c.d.programma, settimana, giorno);
  const prima = voci.find(v => v.serie.some(s => !s.fatta)) || voci[0];
  stato.voceAperta = prima ? prima.id : null;
  stato.scheda = 'allenamento';
  disegna({ inAlto: true });
}

const AZIONI = {
  vai(el) { stato.scheda = el.dataset.scheda; disegna({ inAlto: true }); },

  async esempio() {
    const esito = await archivio.importaScheda(schedaDiEsempio());
    stato.scheda = 'oggi'; disegna({ inAlto: true });
    avviso(esito.ok ? 'Scheda di esempio caricata.' : esito.messaggio);
  },

  'apri-giorno'(el) { apriGiorno(Number(el.dataset.giorno)); },

  'apri-voce'(el) {
    stato.voceAperta = stato.voceAperta === el.dataset.voce ? null : el.dataset.voce;
    disegna();
  },

  // Tocco sulla spunta di una serie. Se segni "fatta" senza aver scritto niente,
  // l'app scrive per te il carico in programma (e le ripetizioni, se erano fisse).
  async spunta(el) {
    const voce = archivio.dati().programma.find(v => v.id === el.dataset.voce);
    const i = Number(el.dataset.serie);
    const s = voce && voce.serie[i];
    if (!s) return;
    const modifiche = { fatta: !s.fatta };
    if (!s.fatta) {
      if (s.kg === null && s.kgTarget !== null) modifiche.kg = s.kgTarget;
      if (s.rip === null && s.ripMin !== null && s.ripMin === s.ripMax) modifiche.rip = s.ripMin;
    }
    if (!await archivio.aggiornaSerie(voce.id, i, modifiche)) return errore();
    disegna();
  },

  async 'modifica-voce'(el) {
    const c = contesto();
    const voce = c.d.programma.find(v => v.id === el.dataset.voce);
    if (voce) await apriModale(htmlModifica(voce, c.nomi[voce.esercizioId] || 'Esercizio', c));
  },

  // ---- modifica della scheda (modalità "da solo", ma funziona per tutti) ----

  'apri-editor'() {
    stato.scheda = 'allenamento'; stato.modifica = true; stato.voceAperta = null;
    disegna({ inAlto: true });
  },

  'modifica-scheda'() {
    stato.modifica = !stato.modifica;
    stato.voceAperta = null;
    disegna();
  },

  async 'aggiungi-voce'(el) {
    const settimana = Number(el.dataset.settimana), giorno = Number(el.dataset.giorno);
    await apriModale(htmlAggiungi(contesto(), settimana, giorno, el.dataset.nuovoGiorno === '1'));
  },

  async 'sposta-voce'(el) {
    if (!await archivio.spostaVoce(el.dataset.voce, Number(el.dataset.direzione))) return errore();
    disegna();
  },

  async 'elimina-voce'(el) {
    const c = contesto();
    const voce = c.d.programma.find(v => v.id === el.dataset.voce);
    if (!voce) return;
    const registrate = voce.serie.filter(s => s.fatta).length;
    const ultimo = c.d.programma.filter(v => v.settimana === voce.settimana && v.giorno === voce.giorno).length === 1;
    const ok = await conferma(`Togliere ${c.nomi[voce.esercizioId] || "l'esercizio"}?`,
      (registrate ? `Ha ${registrate} serie registrate, che andranno perse. ` : '')
      + (ultimo ? 'È l\'unico esercizio del giorno: sparisce anche il giorno. ' : '') + 'Non si può annullare.', 'Togli');
    if (!ok) return;
    if (!await archivio.eliminaVoce(voce.id)) return errore();
    disegna();
  },

  async 'rinomina-giorno'(el) {
    const settimana = Number(el.dataset.settimana), giorno = Number(el.dataset.giorno);
    const voce = archivio.dati().programma.find(v => v.settimana === settimana && v.giorno === giorno);
    if (voce) await apriModale(htmlRinomina(settimana, giorno, voce.nomeGiorno));
  },

  async 'elimina-giorno'(el) {
    const settimana = Number(el.dataset.settimana), giorno = Number(el.dataset.giorno);
    const voci = archivio.dati().programma.filter(v => v.settimana === settimana && v.giorno === giorno);
    if (!voci.length) return;
    const registrate = avanzamento(voci).fatte;
    const ok = await conferma(`Eliminare "${voci[0].nomeGiorno}"?`,
      `Toglie ${voci.length} esercizi dalla settimana ${settimana}` + (registrate ? ` e ${registrate} serie registrate.` : '.') + ' Non si può annullare.', 'Elimina');
    if (!ok) return;
    if (!await archivio.eliminaGiorno(settimana, giorno)) return errore();
    stato.giorno = null;
    if (contesto().ultima === null) stato.modifica = false; // scheda vuota: si riparte dalla schermata iniziale
    disegna();
  },

  async modalita(el) {
    if (!await archivio.salvaProfilo({ modalita: el.dataset.modalita })) return errore();
    stato.modifica = false;
    disegna();
  },

  'chiudi-modale'() { chiudiModale(false); },
  'conferma-modale'() { chiudiModale(true); },

  async 'condividi-giorno'() {
    const c = contesto();
    const { settimana, giorno } = giornoAperto(c);
    await condividi(riepilogoGiorno(vociDelGiorno(c.d.programma, settimana, giorno), c.nomi, settimana));
  },

  'apri-progressi'(el) { stato.esercizioProgressi = el.dataset.esercizio; stato.scheda = 'progressi'; disegna({ inAlto: true }); },
  'scegli-esercizio'(el) { stato.esercizioProgressi = el.dataset.esercizio; disegna(); },

  voto(el) {
    const b = bozza(contesto());
    const n = Number(el.dataset.voto);
    b[el.dataset.campo] = b[el.dataset.campo] === n ? null : n; // secondo tocco = togli il voto
    stato.checkinSalvato = false;
    disegna();
  },

  async 'salva-checkin'() {
    const b = bozza(contesto());
    const peso = numero(b.peso);
    if (b.peso !== '' && (peso === null || peso < 20 || peso > 400)) return avviso('Controlla il peso: scrivi solo il numero, es. 78,4.');
    if (!await archivio.salvaCheckin({ ...b, peso, data: oggi() })) return errore();
    stato.checkinSalvato = true;
    disegna();
  },

  async 'condividi-checkin'() { await condividi(riepilogoCheckin(bozza(contesto()))); },

  async tema(el) {
    if (!await archivio.salvaProfilo({ tema: el.dataset.temaScelto })) return errore();
    applicaTema(archivio.dati().profilo.tema);
    disegna();
  },

  async 'nuova-settimana'() {
    const nuova = await archivio.copiaUltimaSettimana();
    if (nuova === null) return errore();
    stato.settimana = null; stato.giorno = null; stato.bozzaCheckin = null;
    disegna();
    avviso(`Settimana ${nuova} creata: aggiorna i carichi con "Modifica".`);
  },

  async 'elimina-settimana'() {
    const c = contesto();
    const registrate = avanzamento(c.d.programma.filter(v => v.settimana === c.ultima)).fatte;
    const ok = await conferma(`Eliminare la settimana ${c.ultima}?`,
      registrate ? `Contiene ${registrate} serie registrate, che andranno perse. Non si può annullare.` : 'Non contiene serie registrate. Non si può annullare.', 'Elimina');
    if (!ok) return;
    if (!await archivio.eliminaSettimana(c.ultima)) return errore();
    stato.settimana = null; stato.giorno = null; stato.voceAperta = null; stato.bozzaCheckin = null;
    disegna();
    avviso(`Settimana ${c.ultima} eliminata.`);
  },

  async 'importa-scheda'() {
    if (contesto().ultima !== null) {
      const ok = await conferma('Sostituire la scheda?', 'La scheda attuale, comprese le serie che hai registrato, verrà sostituita da quella del file. Prima conviene salvare una copia dei dati.', 'Scegli il file');
      if (!ok) return;
    }
    scegliFile('scheda');
  },

  async esporta() {
    scarica(`rvg-coaching-backup-${oggi()}.json`, await archivio.esportaTutto());
    disegna();
    avviso('Copia salvata nei download.');
  },

  async ripristina() {
    const ok = await conferma('Ripristinare da una copia?', 'Tutti i dati attuali verranno sostituiti da quelli del file.', 'Scegli il file');
    if (ok) scegliFile('backup');
  },

  async 'cancella-tutto'() {
    const ok = await conferma('Cancellare tutti i dati?', 'Scheda, serie registrate e check-in verranno eliminati da questo telefono. Non si può annullare.', 'Cancella tutto');
    if (!ok) return;
    await archivio.cancellaTutto();
    Object.assign(stato, { scheda: 'oggi', settimana: null, giorno: null, voceAperta: null, esercizioProgressi: null, bozzaCheckin: null, checkinSalvato: false });
    applicaTema('originale');
    disegna({ inAlto: true });
    avviso('Dati cancellati.');
  }
};

document.addEventListener('click', evento => {
  const el = evento.target.closest('[data-azione]');
  if (!el) return;
  const azione = AZIONI[el.dataset.azione];
  if (azione) azione(el);
});

// ---------- scrittura nei campi ----------

// Limiti per i numeri di una serie: fuori da qui è quasi certamente un errore di battitura.
const LIMITI = { kg: [0, 1000], rip: [0, 100], rir: [0, 10] };

// Dopo aver scritto in una serie si aggiornano solo le parti che dipendono dai numeri
// (contatore, riassunto, suggerimento), senza ridisegnare tutto: altrimenti la tastiera
// del telefono si chiuderebbe a ogni tasto.
function aggiornaParti(voceId) {
  const c = contesto();
  const voce = c.d.programma.find(v => v.id === voceId);
  if (!voce) return;
  const riassunto = document.querySelector(`[data-riassunto="${voceId}"]`);
  if (riassunto) riassunto.innerHTML = htmlRiassunto(voce);
  const consiglio = document.querySelector(`[data-suggerimento="${voceId}"]`);
  if (consiglio) consiglio.innerHTML = htmlSuggerimento(voce, c.t);
  const { settimana, giorno } = giornoAperto(c);
  const contatore = document.querySelector('[data-avanzamento]');
  if (contatore) contatore.innerHTML = htmlIndicatore(avanzamento(vociDelGiorno(c.d.programma, settimana, giorno)), c.idTema);
}

document.addEventListener('input', async evento => {
  const el = evento.target;
  const campo = el.dataset ? el.dataset.campo : null;
  if (!campo) return;

  if (campo in LIMITI) {
    let valore = numero(el.value);
    const [minimo, massimo] = LIMITI[campo];
    const sbagliato = el.value.trim() !== '' && (valore === null || valore < minimo || valore > massimo || (campo === 'rip' && !Number.isInteger(valore)));
    el.setAttribute('aria-invalid', sbagliato ? 'true' : 'false');
    if (sbagliato) valore = null; // un valore sbagliato non viene salvato
    if (!await archivio.aggiornaSerie(el.dataset.voce, Number(el.dataset.serie), { [campo]: valore })) return errore();
    aggiornaParti(el.dataset.voce);
  } else if (campo === 'nota') {
    if (!await archivio.salvaNota(el.dataset.voce, el.value)) errore();
  } else if (campo === 'nome') {
    if (!await archivio.salvaProfilo({ nome: el.value.trim().slice(0, 40) })) errore();
  } else if (campo.startsWith('checkin-')) {
    bozza(contesto())[campo.slice(8)] = el.value;
    if (stato.checkinSalvato) { // hai cambiato qualcosa dopo aver salvato: va salvato di nuovo
      stato.checkinSalvato = false;
      const bottone = document.querySelector('[data-azione="salva-checkin"]');
      if (bottone) { bottone.textContent = 'Salva check-in'; bottone.classList.remove('salvato'); }
      const invia = document.querySelector('[data-azione="condividi-checkin"]');
      if (invia) invia.remove();
    }
  }
});

document.addEventListener('change', evento => {
  const el = evento.target;
  if (el.id === 'scegliFile') { if (el.files && el.files[0]) leggiFile(el.files[0]); return; }
  const campo = el.dataset ? el.dataset.campo : null;
  if (campo === 'settimana') {
    stato.settimana = Number(el.value); stato.giorno = null; stato.voceAperta = null;
    disegna({ inAlto: true });
  } else if (campo === 'esercizio') {
    stato.esercizioProgressi = el.value;
    disegna();
  }
});

// Legge e controlla i campi del programma (serie, ripetizioni, kg, RIR) da un modulo.
// Restituisce { problema } se qualcosa non va, altrimenti i valori puliti.
function leggiProgramma(modulo) {
  const leggi = nome => numero(modulo.get(nome));
  const serie = leggi('serie');
  let ripMin = leggi('ripMin'), ripMax = leggi('ripMax');
  if (ripMax === null) ripMax = ripMin;
  if (ripMin === null) ripMin = ripMax;
  const kg = leggi('kgTarget'), rir = leggi('rirTarget');
  const problema =
    serie === null || !Number.isInteger(serie) || serie < 1 || serie > 12 ? 'Le serie devono essere un numero da 1 a 12.'
    : ripMin !== null && (!Number.isInteger(ripMin) || !Number.isInteger(ripMax) || ripMin < 1 || ripMax > 100 || ripMin > ripMax) ? 'Controlla le ripetizioni: minimo e massimo, es. 6 e 10.'
    : kg !== null && (kg < 0 || kg > 1000) ? 'Controlla i kg.'
    : rir !== null && (rir < 0 || rir > 10) ? 'Il RIR va da 0 a 10.' : null;
  if (problema) return { problema };
  return { serie, ripMin, ripMax, kgTarget: kg, rirTarget: rir, notaCoach: String(modulo.get('notaCoach') || '') };
}

// Invio dei moduli nelle finestre: "Modifica", "Aggiungi esercizio", "Rinomina giorno".
const MODULI = {
  async 'modulo-modifica'(form, modulo) {
    const p = leggiProgramma(modulo);
    if (p.problema) return avviso(p.problema);
    const esercizioId = await archivio.esercizioPerNome(modulo.get('esercizio'));
    if (!esercizioId) return avviso("Scrivi il nome dell'esercizio.");
    const salvato = await archivio.modificaTarget(form.dataset.voce, { ...p, esercizioId });
    chiudiModale(true);
    if (!salvato) return errore();
    disegna();
  },

  async 'modulo-aggiungi'(form, modulo) {
    const p = leggiProgramma(modulo);
    if (p.problema) return avviso(p.problema);
    const nome = String(modulo.get('esercizio') || '').trim();
    if (!nome) return avviso("Scrivi il nome dell'esercizio.");
    const settimana = Number(form.dataset.settimana), giorno = Number(form.dataset.giorno);
    const esercizioId = await archivio.esercizioPerNome(nome);
    const id = esercizioId && await archivio.aggiungiVoce({
      ...p, settimana, giorno, esercizioId, nomeGiorno: String(modulo.get('nomeGiorno') || '').trim()
    });
    chiudiModale(true);
    if (!id) return errore();
    stato.scheda = 'allenamento';
    stato.settimana = settimana; stato.giorno = giorno; stato.modifica = true;
    disegna();
    avviso(`${nome} aggiunto.`);
  },

  async 'modulo-rinomina'(form, modulo) {
    const ok = await archivio.rinominaGiorno(Number(form.dataset.settimana), Number(form.dataset.giorno), modulo.get('nomeGiorno'));
    if (!ok) return avviso('Scrivi un nome per il giorno.');
    chiudiModale(true);
    disegna();
  }
};

document.addEventListener('submit', async evento => {
  const gestore = MODULI[evento.target.id];
  if (!gestore) return;
  evento.preventDefault();
  await gestore(evento.target, new FormData(evento.target));
});

// Tasto Esc: chiude la finestra aperta.
document.addEventListener('keydown', evento => {
  if (evento.key === 'Escape' && document.body.classList.contains('con-modale')) chiudiModale(false);
});

// ---------- avvio ----------

async function avvia() {
  await archivio.carica();
  applicaTema(archivio.dati().profilo.tema);
  disegna();
  avviaPwa(avviso);
}
avvia();
