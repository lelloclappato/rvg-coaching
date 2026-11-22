// Schermata "Profilo": nome, stile dell'app, scheda e backup.
import { contesto, intestazione } from './comune.js';
import { TEMI } from '../temi.js';
import { esc, dataBreve } from '../utili.js';
import { sincro } from '../sincronizzazione.js';
import { quandoTesto } from '../sincro/sincro.js';

export const VERSIONE_APP = '0.4';

// telefono e computer: sincronizzazione con Google Drive
function sezioneSincro() {
  if (!sincro.disponibile) return '';
  const s = sincro.stato();
  let corpo;
  if (s.fase === 'spento') {
    corpo = `<p>Accedi con Google per avere la stessa scheda, le serie e i check-in sul telefono e sul computer. I dati vanno in una cartella nascosta del tuo Google Drive, riservata a queste app: non vedono gli altri tuoi file.</p>
      <div class="colonna-bottoni"><button class="bottone primario" data-azione="sincro-collega">Accedi con Google</button></div>`;
  } else {
    const riga = s.fase === 'in-corso' ? 'Sincronizzo…'
      : s.fase === 'errore' ? esc(s.errore)
      : s.fase === 'da-riconnettere' ? `L’accesso a Google è scaduto (dura un’ora)${sincro.daInviare() ? ': ci sono modifiche da inviare' : ''}.`
      : s.ultima ? `Sincronizzato ${quandoTesto(s.ultima)}.` : '';
    corpo = `${s.email ? `<p class="tenue piccolo">Collegato come <b>${esc(s.email)}</b>. Usa lo stesso account sugli altri dispositivi.</p>` : ''}
      ${riga ? `<p role="status"><b>${riga}</b></p>` : ''}
      <div class="colonna-bottoni">
        <button class="bottone" data-azione="sincro-ora" ${s.fase === 'in-corso' ? 'disabled' : ''}>Sincronizza adesso</button>
        <button class="bottone" data-azione="sincro-scollega">Scollega questo dispositivo</button>
      </div>`;
  }
  return `<h2 class="titolo-sezione">Telefono e computer</h2>
    <section class="scheda">${corpo}</section>`;
}

export function vistaProfilo() {
  const c = contesto();
  const { d } = c;

  const stili = Object.entries(TEMI).map(([id, t]) => `
    <button class="stile ${id === c.idTema ? 'scelto' : ''}" data-azione="tema" data-tema-scelto="${id}" aria-pressed="${id === c.idTema}">
      <span class="stile-colori" aria-hidden="true">${t.anteprima.map(col => `<span style="background:${col}"></span>`).join('')}</span>
      <span class="stile-nome">${esc(t.nome)}</span>
      <span class="stile-descrizione">${esc(t.descrizione)}</span>
    </button>`).join('');

  // "Con Riccardo": la scheda arriva da lui. "Da solo": te la scrivi e la modifichi tu.
  const modi = [
    ['coach', 'Con Riccardo', 'La scheda te la prepara il coach: tu registri e gli mandi i riepiloghi.'],
    ['solo', 'Da solo', 'Ti gestisci tutto tu: crei e modifichi la scheda direttamente nell\'app.']
  ].map(([id, nome, testo]) => `
    <button class="stile ${d.profilo.modalita === id ? 'scelto' : ''}" data-azione="modalita" data-modalita="${id}" aria-pressed="${d.profilo.modalita === id}">
      <span class="stile-nome">${nome}</span>
      <span class="stile-descrizione">${testo}</span>
    </button>`).join('');

  const haScheda = c.ultima !== null;
  const scheda = haScheda
    ? `<p>${c.settimane.length} settimane (dalla ${c.settimane[0]} alla ${c.ultima}) · ${d.esercizi.length} esercizi</p>
       <div class="colonna-bottoni">
         ${c.solo ? `<button class="bottone primario" data-azione="apri-editor">Modifica la scheda</button>` : ''}
         <button class="bottone" data-azione="nuova-settimana">Nuova settimana (copia la ${c.ultima})</button>
         <button class="bottone" data-azione="importa-scheda">Importa un'altra scheda</button>
         <button class="bottone pericolo" data-azione="elimina-settimana">Elimina la settimana ${c.ultima}</button>
       </div>`
    : `<p class="tenue">Nessuna scheda caricata.</p>
       <div class="colonna-bottoni">
         ${c.solo ? `<button class="bottone primario" data-azione="aggiungi-voce" data-settimana="1" data-giorno="1" data-nuovo-giorno="1">Crea la scheda da zero</button>` : ''}
         <button class="bottone ${c.solo ? '' : 'primario'}" data-azione="importa-scheda">Importa scheda (file .json)</button>
         <button class="bottone" data-azione="esempio">Prova con una scheda di esempio</button>
       </div>`;

  return `${intestazione('RVG Coaching', 'Profilo')}
    <section class="scheda">
      <label class="etichetta-campo" for="nome">Il tuo nome</label>
      <input id="nome" class="campo largo sinistra" data-campo="nome" maxlength="40" autocomplete="given-name" value="${esc(d.profilo.nome)}" placeholder="Come ti chiami?">
    </section>

    <h2 class="titolo-sezione">Come ti alleni</h2>
    <div class="stili due">${modi}</div>

    <h2 class="titolo-sezione">Stile dell'app</h2>
    <div class="stili">${stili}</div>

    <h2 class="titolo-sezione">Scheda</h2>
    <section class="scheda">${scheda}</section>
${c.solo ? `
    <h2 class="titolo-sezione">Esercizi</h2>
    <section class="scheda">
      <p>${d.esercizi.length === 1 ? '1 esercizio' : `${d.esercizi.length} esercizi`} nella tua lista. Quando aggiungi un esercizio alla scheda lo scegli da qui.</p>
      <div class="colonna-bottoni"><button class="bottone" data-azione="lista-esercizi">Lista esercizi</button></div>
    </section>
` : ''}
    ${sezioneSincro()}
    <h2 class="titolo-sezione">Backup</h2>
    <section class="scheda">
      <p>${sincro.disponibile && sincro.stato().fase !== 'spento' ? 'I dati sono anche sul tuo Google Drive, ma una copia in più non fa mai male.' : 'I dati restano solo su questo telefono. Ogni tanto salva una copia: se cambi telefono o cancelli i dati del browser, è l\'unico modo per riaverli.'}</p>
      <p class="tenue piccolo">Ultimo backup: ${d.ultimoBackup ? esc(dataBreve(d.ultimoBackup)) : 'mai'}</p>
      <div class="colonna-bottoni">
        <button class="bottone" data-azione="esporta">Salva una copia dei dati</button>
        <button class="bottone" data-azione="ripristina">Ripristina da una copia</button>
        <button class="bottone pericolo" data-azione="cancella-tutto">Cancella tutti i dati</button>
      </div>
    </section>
    <p class="tenue piccolo centrato">RVG Coaching · versione ${VERSIONE_APP}</p>`;
}
