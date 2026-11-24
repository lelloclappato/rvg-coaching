// Punto di partenza dell'app: carica i dati, disegna la schermata e ascolta tocchi e scritture.
//
// Come funziona, in breve:
//  1. ogni schermata è una funzione (in js/viste/) che restituisce dell'HTML come testo
//  2. disegna() mette quell'HTML nella pagina
//  3. bottoni e campi hanno attributi "data-azione" / "data-campo": un solo ascoltatore
//     per tutta la pagina guarda quale è stato toccato e decide cosa fare
import * as archivio from './dati.js';
import { stato } from './stato.js';
import { applicaTema, tema, testiPer } from './temi.js';
import { icone } from './icone.js';
import { numero, esc, oggi } from './utili.js';
import { avanzamento, vociDelGiorno, riepilogoGiorno, orologio, durataBreve, giornoCompleto, voceChiusa } from './calcoli.js';
import { schedaDiEsempio } from './esempio.js';
import { contesto } from './viste/comune.js';
import { vistaOggi } from './viste/oggi.js';
import { vistaAllenamento, giornoAperto, htmlIndicatore, htmlRiassunto, htmlSuggerimento, htmlModifica, htmlAggiungi, htmlRinomina, htmlInfoProssima } from './viste/allenamento.js';
import { vistaProgressi } from './viste/progressi.js';
import { vistaCheckin, bozza, riepilogoCheckin, vistaCheckinCliente } from './viste/checkin.js';
import { vistaClienti, vistaSceltaCliente, strisciaCliente, htmlModuloCliente } from './viste/clienti.js';
import { vistaProfilo } from './viste/profilo.js';
import { htmlListaEsercizi, htmlEsercizioForm } from './viste/esercizi.js';
import { apriModale, chiudiModale, conferma } from './viste/modale.js';
import { avviaPwa } from './pwa.js';
import { sincro, quandoArrivanoDati, comeChiedere } from './sincronizzazione.js';

const VISTE = { oggi: vistaOggi, allenamento: vistaAllenamento, progressi: vistaProgressi, checkin: vistaCheckin, profilo: vistaProfilo };
const $ = selettore => document.querySelector(selettore);

// ---------- disegno ----------

function disegnaSchede() {
  const { tema: idTema, modalita } = archivio.dati().profilo;
  const t = tema(idTema);
  const nomi = testiPer(t, modalita).schede;
  const allenatore = modalita === 'allenatore';
  $('#schede').innerHTML = Object.keys(VISTE).map(id =>
    `<button class="tab ${stato.scheda === id ? 'attiva' : ''}" data-azione="vai" data-scheda="${id}" ${stato.scheda === id ? 'aria-current="page"' : ''}>
      ${icone[allenatore && id === 'oggi' ? 'clienti' : id]}<span>${esc(nomi[id])}</span></button>`).join('');
}

// Quale schermata disegnare. Se fai il coach: "Oggi" diventa l'elenco dei clienti,
// e Scheda, Progressi e Check-in mostrano i dati del cliente aperto.
function htmlVista() {
  const allenatore = archivio.dati().profilo.modalita === 'allenatore';
  archivio.usaCliente(allenatore ? stato.cliente : null);
  if (!allenatore) return VISTE[stato.scheda]();
  if (stato.scheda === 'oggi') return vistaClienti();
  if (stato.scheda === 'profilo') return vistaProfilo();
  const cliente = archivio.clienteAperto();
  if (!cliente) return vistaSceltaCliente();
  return strisciaCliente(cliente) + (stato.scheda === 'checkin' ? vistaCheckinCliente() : VISTE[stato.scheda]());
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
  app.innerHTML = htmlVista();
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
    avviso(contesto().solo ? 'Copiato: ora puoi incollarlo dove vuoi.' : 'Copiato: ora incollalo nella chat con il coach.');
  } catch (e) {
    await apriModale(`<h2>Riepilogo</h2><textarea class="campo testo" rows="10" readonly>${esc(testo)}</textarea>
      <div class="riga-bottoni"><button class="bottone primario" data-azione="chiudi-modale">Chiudi</button></div>`);
  }
}

// Manda un file (WhatsApp, email…) se il telefono lo permette, altrimenti lo salva nei download.
async function condividiFile(nomeFile, testo) {
  try {
    const file = new File([testo], nomeFile, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  scarica(nomeFile, testo);
  avviso('File salvato nei download: mandalo su WhatsApp o per email.');
}
const perNomeFile = testo => String(testo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cliente';

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
  const esito = fileAtteso === 'backup' ? await archivio.ripristina(contenuto)
    : fileAtteso === 'dati-cliente' ? await archivio.caricaDatiCliente(contenuto)
    : await archivio.importaScheda(contenuto);
  if (esito.ok) {
    stato.settimana = null; stato.giorno = null; stato.voceAperta = null; stato.bozzaCheckin = null;
    applicaTema(archivio.dati().profilo.tema);
    stato.scheda = fileAtteso === 'backup' ? 'profilo' : fileAtteso === 'dati-cliente' || archivio.clienteAperto() ? 'allenamento' : 'oggi';
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

// Il timer parte da solo alla prima serie spuntata (solo nella settimana in corso:
// se stai segnando una settimana vecchia non parte) e si ferma da solo all'ultima.
async function timerDopoSpunta(settimana, giorno) {
  const c = contesto();
  if (settimana === c.ultima && !archivio.sessione(settimana, giorno)) await archivio.avviaSessione(settimana, giorno, Date.now());
  await fineSeCompleto(settimana, giorno);
}

// Se tutti gli esercizi del giorno sono fatti o saltati, ferma il timer (se sta andando).
async function fineSeCompleto(settimana, giorno) {
  const x = archivio.sessione(settimana, giorno);
  if (x && x.fine === null && giornoCompleto(vociDelGiorno(archivio.area().programma, settimana, giorno))) {
    await archivio.fermaSessione(settimana, giorno, Date.now());
    avviso(`Allenamento finito: ${durataBreve(x.fine - x.inizio)}.`);
  }
}

const AZIONI = {
  vai(el) { stato.scheda = el.dataset.scheda; disegna({ inAlto: true }); },

  async esempio() {
    const esito = await archivio.importaScheda(schedaDiEsempio());
    stato.scheda = archivio.clienteAperto() ? 'allenamento' : 'oggi'; disegna({ inAlto: true });
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
    const voce = archivio.area().programma.find(v => v.id === el.dataset.voce);
    const i = Number(el.dataset.serie);
    const s = voce && voce.serie[i];
    if (!s) return;
    const modifiche = { fatta: !s.fatta };
    if (!s.fatta) {
      if (s.kg === null && s.kgTarget !== null) modifiche.kg = s.kgTarget;
      if (s.rip === null && s.ripMin !== null && s.ripMin === s.ripMax) modifiche.rip = s.ripMin;
    }
    if (!await archivio.aggiornaSerie(voce.id, i, modifiche)) return errore();
    if (modifiche.fatta) await timerDopoSpunta(voce.settimana, voce.giorno);
    disegna();
  },

  // ---- clienti (modalità coach) ----
  async 'nuovo-cliente'() { await apriModale(htmlModuloCliente()); },
  'apri-cliente'(el) {
    stato.cliente = el.dataset.cliente;
    stato.settimana = null; stato.giorno = null; stato.voceAperta = null; stato.modifica = false;
    stato.scheda = 'allenamento';
    disegna({ inAlto: true });
  },
  async 'manda-scheda'(el) {
    archivio.usaCliente(el.dataset.cliente);
    const cliente = archivio.clienteAperto();
    const file = archivio.schedaDelCliente();
    archivio.usaCliente(stato.cliente);
    if (!file) return;
    await condividiFile(`scheda-${perNomeFile(cliente.nome)}.json`, file);
  },
  'carica-dati-cliente'(el) {
    stato.cliente = el.dataset.cliente;
    archivio.usaCliente(stato.cliente);
    scegliFile('dati-cliente');
  },
  async 'rinomina-cliente'(el) {
    const cliente = archivio.dati().clienti.find(x => x.id === el.dataset.cliente);
    if (cliente) await apriModale(htmlModuloCliente(cliente));
  },
  async 'elimina-cliente'(el) {
    const cliente = archivio.dati().clienti.find(x => x.id === el.dataset.cliente);
    if (!cliente) return;
    const ok = await conferma(`Eliminare ${cliente.nome}?`, 'La sua scheda e i dati che ti ha mandato spariscono da questo telefono. Il cliente non perde niente. Non si può annullare.', 'Elimina');
    if (!ok) return;
    if (!await archivio.eliminaCliente(cliente.id)) return errore();
    if (stato.cliente === cliente.id) stato.cliente = null;
    disegna();
    avviso(`${cliente.nome} eliminato.`);
  },
  // il cliente manda al coach quello che ha fatto
  async 'manda-al-coach'() {
    const nome = archivio.dati().profilo.nome;
    await condividiFile(`dati-${perNomeFile(nome || 'cliente')}-${oggi()}.json`, await archivio.esportaTutto());
  },

  // ---- saltare un esercizio ----
  async 'salta-voce'(el) {
    const voce = archivio.area().programma.find(v => v.id === el.dataset.voce);
    if (!voce || !await archivio.saltaVoce(voce.id, true)) return errore();
    // apri il prossimo esercizio ancora da fare
    const voci = vociDelGiorno(archivio.area().programma, voce.settimana, voce.giorno);
    const dopo = voci.slice(voci.indexOf(voce) + 1).find(v => !voceChiusa(v)) || voci.find(v => !voceChiusa(v));
    stato.voceAperta = dopo ? dopo.id : null;
    await fineSeCompleto(voce.settimana, voce.giorno);
    disegna();
    if (!archivio.sessione(voce.settimana, voce.giorno) || archivio.sessione(voce.settimana, voce.giorno).fine === null) {
      avviso(`${contesto().nomi[voce.esercizioId] || 'Esercizio'} saltato.`);
    }
  },
  async 'annulla-salto'(el) {
    if (!await archivio.saltaVoce(el.dataset.voce, false)) return errore();
    disegna();
  },

  // ---- lista degli esercizi ----
  async 'lista-esercizi'() { await apriModale(htmlListaEsercizi(contesto())); },
  async 'nuovo-esercizio'() { await apriModale(htmlEsercizioForm(contesto())); },
  async 'modifica-esercizio'(el) {
    const c = contesto();
    const esercizio = c.d.esercizi.find(e => e.id === el.dataset.esercizio);
    if (esercizio) await apriModale(htmlEsercizioForm(c, esercizio));
  },
  async 'elimina-esercizio'(el) {
    const esercizio = archivio.area().esercizi.find(e => e.id === el.dataset.esercizio);
    if (!esercizio) return;
    const ok = await conferma(`Togliere ${esercizio.nome} dalla lista?`, 'Non è usato nella scheda, quindi non perdi niente. Potrai ricrearlo quando vuoi.', 'Togli');
    if (ok && !await archivio.eliminaEsercizio(esercizio.id)) return errore();
    disegna();
    await apriModale(htmlListaEsercizi(contesto()));
  },

  // ---- timer dell'allenamento ----
  async 'timer-avvia'(el) {
    if (!await archivio.avviaSessione(Number(el.dataset.settimana), Number(el.dataset.giorno), Date.now())) return errore();
    disegna();
  },
  async 'timer-ferma'(el) {
    const settimana = Number(el.dataset.settimana), giorno = Number(el.dataset.giorno);
    if (!await archivio.fermaSessione(settimana, giorno, Date.now())) return errore();
    disegna();
    const x = archivio.sessione(settimana, giorno);
    avviso(`Allenamento finito: ${durataBreve(x.fine - x.inizio)}.`);
  },
  async 'timer-riprendi'(el) {
    if (!await archivio.riprendiSessione(Number(el.dataset.settimana), Number(el.dataset.giorno))) return errore();
    disegna();
  },
  async 'timer-azzera'(el) {
    const ok = await conferma('Azzerare il timer?', 'La durata di questo allenamento verrà cancellata.', 'Azzera');
    if (!ok) return;
    if (!await archivio.azzeraSessione(Number(el.dataset.settimana), Number(el.dataset.giorno))) return errore();
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
    const voce = archivio.area().programma.find(v => v.settimana === settimana && v.giorno === giorno);
    if (voce) await apriModale(htmlRinomina(settimana, giorno, voce.nomeGiorno));
  },

  async 'elimina-giorno'(el) {
    const settimana = Number(el.dataset.settimana), giorno = Number(el.dataset.giorno);
    const voci = archivio.area().programma.filter(v => v.settimana === settimana && v.giorno === giorno);
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
    stato.modifica = false; stato.cliente = null;
    stato.settimana = null; stato.giorno = null; stato.voceAperta = null;
    disegna();
  },

  'chiudi-modale'() { chiudiModale(false); },
  'scelta-modale'(el) { chiudiModale(el.dataset.valore); },

  // ---------- telefono e computer (sincronizzazione con Google Drive) ----------
  async 'sincro-collega'() { await sincronizzaOra(); },
  async 'sincro-ora'() { await sincronizzaOra(); },
  async 'sincro-scollega'() {
    const ok = await conferma('Scollegare questo dispositivo?', 'I dati restano qui e sul tuo Google Drive, ma smettono di sincronizzarsi su questo dispositivo.', 'Scollega');
    if (!ok) return;
    await sincro.scollega(); disegna(); avviso('Scollegato.');
  },
  'conferma-modale'() { chiudiModale(true); },

  async 'condividi-giorno'() {
    const c = contesto();
    const { settimana, giorno } = giornoAperto(c);
    const x = archivio.sessione(settimana, giorno);
    const durata = x ? (x.fine ?? Date.now()) - x.inizio : null;
    await condividi(riepilogoGiorno(vociDelGiorno(c.d.programma, settimana, giorno), c.nomi, settimana, durata));
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
      const ok = await conferma('Importare una scheda?', "Se è l'aggiornamento della stessa scheda (per esempio quella nuova del coach), le serie che hai segnato restano. Se è una scheda diversa, sostituisce quella attuale: prima conviene salvare una copia dei dati.", 'Scegli il file');
      if (!ok) return;
    }
    scegliFile('scheda');
  },

  async esporta() {
    scarica(`hexis-backup-${oggi()}.json`, await archivio.esportaTutto());
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
  } else if (campo === 'regolazione') {
    if (!await archivio.salvaRegolazione(el.dataset.esercizio, el.value.trim())) return errore();
    const testo = el.value.trim();
    document.querySelectorAll(`[data-regolazione="${el.dataset.esercizio}"]`).forEach(r => { r.textContent = testo ? `⚙ ${testo}` : ''; });
  } else if (campo === 'prossima') {
    const kg = numero(el.value);
    if (el.value.trim() !== '' && (kg === null || kg < 0 || kg > 1000)) return; // numero a metà o sbagliato: aspetta
    const esito = await archivio.segnaProssima(el.dataset.voce, kg);
    if (!esito.ok) return errore();
    const voce = archivio.area().programma.find(v => v.id === el.dataset.voce);
    const info = document.querySelector(`[data-info-prossima="${el.dataset.voce}"]`);
    if (info && voce) info.innerHTML = htmlInfoProssima(voce);
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
  } else if (campo === 'scelta-esercizio') {
    // "+ Nuovo esercizio": mostra i campi per crearlo
    const blocco = el.form && el.form.querySelector('[data-nuovo-esercizio]');
    if (!blocco) return;
    const nuovo = el.value === 'nuovo';
    blocco.hidden = !nuovo;
    const nome = blocco.querySelector('[name="nomeNuovo"]');
    nome.required = nuovo;
    if (nuovo) nome.focus();
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

// Il campo "Esercizio" delle finestre: un esercizio della lista, oppure uno nuovo da creare.
// Restituisce { id } oppure { problema }.
async function esercizioScelto(modulo) {
  const scelta = String(modulo.get('esercizioId') || '');
  if (scelta && scelta !== 'nuovo') return { id: scelta };
  if (!scelta) return { problema: "Scegli l'esercizio dalla lista." };
  const esito = await archivio.creaEsercizio({ nome: modulo.get('nomeNuovo'), gruppo: modulo.get('gruppoNuovo') });
  if (esito.ok) return { id: esito.id };
  return esito.id ? { problema: `${esito.messaggio} Sceglilo dalla lista.` } : { problema: esito.messaggio };
}

// Invio dei moduli nelle finestre: "Modifica", "Aggiungi esercizio", "Rinomina giorno", "Esercizio".
const MODULI = {
  async 'modulo-modifica'(form, modulo) {
    const p = leggiProgramma(modulo);
    if (p.problema) return avviso(p.problema);
    const scelto = await esercizioScelto(modulo);
    if (scelto.problema) return avviso(scelto.problema);
    const esercizioId = scelto.id;
    const salvato = await archivio.modificaTarget(form.dataset.voce, { ...p, esercizioId });
    chiudiModale(true);
    if (!salvato) return errore();
    disegna();
  },

  async 'modulo-aggiungi'(form, modulo) {
    const p = leggiProgramma(modulo);
    if (p.problema) return avviso(p.problema);
    const scelto = await esercizioScelto(modulo);
    if (scelto.problema) return avviso(scelto.problema);
    const esercizioId = scelto.id;
    const nome = contesto().nomi[esercizioId] || 'Esercizio';
    const settimana = Number(form.dataset.settimana), giorno = Number(form.dataset.giorno);
    const id = await archivio.aggiungiVoce({
      ...p, settimana, giorno, esercizioId, nomeGiorno: String(modulo.get('nomeGiorno') || '').trim()
    });
    chiudiModale(true);
    if (!id) return errore();
    stato.scheda = 'allenamento';
    stato.settimana = settimana; stato.giorno = giorno; stato.modifica = true;
    disegna();
    avviso(`${nome} aggiunto.`);
  },

  async 'modulo-esercizio'(form, modulo) {
    const dati = { nome: modulo.get('nome'), gruppo: modulo.get('gruppo'), regolazione: modulo.get('regolazione') };
    const esito = form.dataset.esercizio
      ? await archivio.aggiornaEsercizio(form.dataset.esercizio, dati)
      : await archivio.creaEsercizio(dati);
    if (!esito.ok) return avviso(esito.messaggio);
    disegna();
    await apriModale(htmlListaEsercizi(contesto()));
  },

  async 'modulo-cliente'(form, modulo) {
    const nome = String(modulo.get('nome') || '').trim();
    if (!nome) return avviso('Scrivi il nome del cliente.');
    if (form.dataset.cliente) {
      if (!await archivio.rinominaCliente(form.dataset.cliente, nome)) return errore();
      chiudiModale(true);
      return disegna();
    }
    const id = await archivio.creaCliente(nome);
    chiudiModale(true);
    if (!id) return errore();
    stato.cliente = id;
    stato.settimana = null; stato.giorno = null; stato.voceAperta = null;
    stato.scheda = 'allenamento';
    disegna({ inAlto: true });
    avviso(`${nome} aggiunto: ora preparagli la scheda.`);
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

// Ogni secondo aggiorna il tempo del timer, se è sullo schermo (senza ridisegnare il resto).
setInterval(() => {
  document.querySelectorAll('[data-timer]').forEach(el => { el.textContent = orologio(Date.now() - Number(el.dataset.inizio)); });
}, 1000);

// ---------- sincronizzazione ----------
async function sincronizzaOra() {
  const s = await sincro.collega();
  if (s.fase === 'pronto') avviso('Sincronizzato.');
  else if (s.errore) avviso(s.errore);
  ridisegnaSePuoi();
}
// Si ridisegna solo se non c'è una finestra aperta e non stai scrivendo (es. un peso): altrimenti si aspetta.
const staiScrivendo = () => { const a = document.activeElement; return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); };
let daRidisegnare = false;
function ridisegnaSePuoi() {
  if (document.body.classList.contains('con-modale') || staiScrivendo()) { daRidisegnare = true; return; }
  daRidisegnare = false; disegna();
}
document.addEventListener('focusout', () => setTimeout(() => { if (daRidisegnare) ridisegnaSePuoi(); }, 0));
quandoArrivanoDati(() => { applicaTema(archivio.dati().profilo.tema); ridisegnaSePuoi(); });
sincro.ascolta(() => { if (stato.scheda === 'profilo' || stato.scheda === 'oggi') ridisegnaSePuoi(); });
// la prima volta che questo dispositivo si collega, se qui e sull'account ci sono dati diversi
comeChiedere(async ({ qui, account }) => (await apriModale(`
  <h2>Sul tuo account ci sono già dei dati</h2>
  <p>Sull’account: ${esc(account)}. Su questo dispositivo: ${esc(qui)}. Cosa vuoi tenere?</p>
  <div class="colonna-bottoni">
    <button class="bottone primario" data-azione="scelta-modale" data-valore="unisci">Tutti e due: uniscili</button>
    <button class="bottone" data-azione="scelta-modale" data-valore="account">Solo quelli dell’account</button>
    <button class="bottone" data-azione="scelta-modale" data-valore="annulla">Annulla, non collegare</button>
  </div>`)) || 'annulla');

async function avvia() {
  await archivio.carica();
  applicaTema(archivio.dati().profilo.tema);
  disegna();
  avviaPwa(avviso);
  sincro.avvia();
}
avvia();
