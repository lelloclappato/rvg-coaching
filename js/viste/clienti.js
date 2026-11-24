// Schermata "Clienti" (modalità coach): l'elenco dei clienti, con quello che serve per seguirli.
//
// Come funziona tra coach e cliente, senza server:
//  1. il coach crea il cliente e gli prepara la scheda (con lo stesso editor di "da solo")
//  2. "Manda la scheda": il cliente riceve un file e lo importa dal suo Profilo
//  3. il cliente si allena e dal Profilo fa "Manda i miei dati al coach"
//  4. il coach fa "Carica i suoi dati": vede serie, progressi e check-in
// Quando la scheda va e viene, le serie fatte non si perdono (vedi js/unione.js).
import { contesto, intestazione } from './comune.js';
import { stato } from '../stato.js';
import { avanzamento, settimane } from '../calcoli.js';
import { esc, fmt, dataBreve } from '../utili.js';

function htmlCliente(cliente) {
  const elenco = settimane(cliente.programma);
  const ultima = elenco.length ? elenco[elenco.length - 1] : null;
  // l'ultima settimana in cui il cliente ha segnato qualcosa
  const conDati = [...elenco].reverse().find(s => avanzamento(cliente.programma.filter(v => v.settimana === s)).fatte > 0);
  const av = conDati ? avanzamento(cliente.programma.filter(v => v.settimana === conDati)) : null;
  const checkin = [...cliente.checkin].sort((a, b) => b.settimana - a.settimana)[0];
  const aperto = stato.cliente === cliente.id;
  const id = esc(cliente.id);
  const righe = [
    ultima === null ? 'Scheda ancora da preparare' : `Scheda: ${elenco.length === 1 ? '1 settimana' : `${elenco.length} settimane`}, fino alla ${ultima}`,
    cliente.aggiornato ? `Ultimi dati ricevuti il ${dataBreve(cliente.aggiornato)}` : 'Non ti ha ancora mandato dati',
    av ? `Settimana ${conDati}: ${av.fatte} serie su ${av.totali}` : '',
    checkin ? `Check-in settimana ${checkin.settimana}${checkin.peso ? `: ${fmt(checkin.peso)} kg` : ''}` : ''
  ].filter(Boolean);
  return `<section class="scheda cliente ${aperto ? 'aperto' : ''}" aria-label="${esc(cliente.nome)}">
    <div class="cliente-testa">
      <h2>${esc(cliente.nome)}</h2>
      ${aperto ? '<span class="piccolo positivo">aperto</span>' : ''}
    </div>
    <ul class="cliente-righe">${righe.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    <div class="colonna-bottoni">
      <button class="bottone primario" data-azione="apri-cliente" data-cliente="${id}">Apri la scheda</button>
      <div class="riga-bottoni">
        <button class="bottone" data-azione="manda-scheda" data-cliente="${id}" ${ultima === null ? 'disabled' : ''}>Manda la scheda</button>
        <button class="bottone" data-azione="carica-dati-cliente" data-cliente="${id}">Carica i suoi dati</button>
      </div>
      <div class="riga-bottoni">
        <button class="bottone piccolo" data-azione="rinomina-cliente" data-cliente="${id}">Rinomina</button>
        <button class="bottone piccolo pericolo" data-azione="elimina-cliente" data-cliente="${id}">Elimina</button>
      </div>
    </div>
  </section>`;
}

export function vistaClienti() {
  const c = contesto();
  const clienti = [...c.d.clienti].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  const vuoto = `<section class="scheda vuoto">
      <h2>Aggiungi il primo cliente</h2>
      <ol class="passi">
        <li>Crei il cliente e gli prepari la scheda qui nell'app.</li>
        <li>Con "Manda la scheda" gli arriva un file: lui lo apre dal Profilo, con "Importa scheda".</li>
        <li>Dopo l'allenamento ti rimanda i suoi dati dal Profilo. Tu fai "Carica i suoi dati" e vedi serie, progressi e check-in.</li>
      </ol>
    </section>`;
  return `${intestazione('Hexis', c.t.testi.schede.oggi)}
    <button class="bottone primario grande" data-azione="nuovo-cliente">+ Nuovo cliente</button>
    ${clienti.length ? clienti.map(htmlCliente).join('') : vuoto}`;
}

// Quando fai il coach e non hai aperto nessun cliente.
export function vistaSceltaCliente() {
  const c = contesto();
  return `${intestazione('Hexis', c.t.testi.schede[stato.scheda] || '')}
    <section class="scheda vuoto">
      <h2>Scegli un cliente</h2>
      <p>Qui vedi la scheda, i progressi e i check-in del cliente che apri.</p>
      <div class="riga-bottoni"><button class="bottone primario" data-azione="vai" data-scheda="oggi">Vai ai clienti</button></div>
    </section>`;
}

// La striscia in alto che dice di quale cliente stai guardando i dati.
export function strisciaCliente(cliente) {
  return `<div class="striscia-cliente">
    <span>Cliente: <b>${esc(cliente.nome)}</b></span>
    <button class="bottone piccolo" data-azione="vai" data-scheda="oggi">Cambia</button>
  </div>`;
}

// Modulo per creare o rinominare un cliente.
export function htmlModuloCliente(cliente = null) {
  return `<h2>${cliente ? 'Rinomina cliente' : 'Nuovo cliente'}</h2>
    <form id="modulo-cliente" ${cliente ? `data-cliente="${esc(cliente.id)}"` : ''}>
      <label class="etichetta-campo">Nome
        <input class="campo largo sinistra" name="nome" maxlength="40" autocomplete="off" value="${esc(cliente ? cliente.nome : '')}" placeholder="es. Luca Rossi" required>
      </label>
      <div class="riga-bottoni">
        <button type="button" class="bottone" data-azione="chiudi-modale">Annulla</button>
        <button type="submit" class="bottone primario">${cliente ? 'Salva' : 'Crea il cliente'}</button>
      </div>
    </form>`;
}
