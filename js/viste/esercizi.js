// La lista dei tuoi esercizi: la finestra per gestirla (Profilo → Lista esercizi)
// e il campo "Esercizio" delle finestre Aggiungi/Modifica, dove scegli dalla lista
// oppure ne crei uno nuovo sul momento.
import { esc } from '../utili.js';
import { usiEsercizio } from '../dati.js';

// Gruppi muscolari proposti mentre scrivi (puoi comunque scriverne uno tuo).
const GRUPPI_BASE = ['Petto', 'Schiena', 'Spalle', 'Bicipiti', 'Tricipiti', 'Avambracci', 'Gambe',
  'Quadricipiti', 'Femorali', 'Posteriore', 'Glutei', 'Adduttori', 'Abduttori', 'Polpacci', 'Addome', 'Cardio'];
const SENZA_GRUPPO = 'Senza gruppo';

function elencoGruppi(c) {
  const tutti = new Set([...GRUPPI_BASE, ...c.d.esercizi.map(e => e.gruppo).filter(Boolean)]);
  return `<datalist id="elenco-gruppi">${[...tutti].sort((a, b) => a.localeCompare(b, 'it')).map(g => `<option value="${esc(g)}"></option>`).join('')}</datalist>`;
}

// Esercizi divisi per gruppo, gruppi e nomi in ordine alfabetico ("Senza gruppo" in fondo).
function perGruppo(esercizi) {
  const mappa = new Map();
  for (const e of esercizi) {
    const g = e.gruppo || SENZA_GRUPPO;
    if (!mappa.has(g)) mappa.set(g, []);
    mappa.get(g).push(e);
  }
  return [...mappa.entries()]
    .sort(([a], [b]) => (a === SENZA_GRUPPO) - (b === SENZA_GRUPPO) || a.localeCompare(b, 'it'))
    .map(([gruppo, lista]) => [gruppo, lista.sort((a, b) => a.nome.localeCompare(b.nome, 'it'))]);
}

// Campo "Esercizio": scegli dalla lista (divisa per gruppo) oppure "+ Nuovo esercizio".
// Con "nuovo" compaiono i campi per nome e gruppo. selezionato = id dell'esercizio già scelto.
export function htmlSceltaEsercizio(c, selezionato = '') {
  const vuota = c.d.esercizi.length === 0;
  const nuovo = vuota || selezionato === 'nuovo';
  const gruppi = perGruppo([...c.d.esercizi]).map(([gruppo, lista]) =>
    `<optgroup label="${esc(gruppo)}">${lista.map(e =>
      `<option value="${esc(e.id)}" ${e.id === selezionato ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}</optgroup>`
  ).join('');
  return `<label class="etichetta-campo">Esercizio
      <select class="campo largo sinistra scelta" name="esercizioId" data-campo="scelta-esercizio" required>
        ${vuota ? '' : `<option value="" ${selezionato ? '' : 'selected'} disabled>Scegli dalla lista…</option>`}
        <option value="nuovo" ${nuovo ? 'selected' : ''}>＋ Nuovo esercizio</option>
        ${gruppi}
      </select>
    </label>
    <div class="nuovo-esercizio" data-nuovo-esercizio ${nuovo ? '' : 'hidden'}>
      <label class="etichetta-campo">Nome del nuovo esercizio
        <input class="campo largo sinistra" name="nomeNuovo" maxlength="60" autocomplete="off" placeholder="es. Chest fly macchinario" ${nuovo ? 'required' : ''}>
      </label>
      <label class="etichetta-campo"><span>Gruppo muscolare <span class="tenue">(facoltativo)</span></span>
        <input class="campo largo sinistra" name="gruppoNuovo" list="elenco-gruppi" maxlength="30" autocomplete="off" placeholder="es. Petto">
      </label>
      ${elencoGruppi(c)}
    </div>`;
}

// Finestra "Lista esercizi".
export function htmlListaEsercizi(c) {
  const righe = perGruppo([...c.d.esercizi]).map(([gruppo, lista]) => `
    <h3 class="gruppo-titolo">${esc(gruppo)}</h3>
    ${lista.map(e => {
      const usi = usiEsercizio(e.id);
      return `<div class="riga-lista">
        <span class="riga-lista-testi">
          <span class="voce-nome">${esc(e.nome)}</span>
          <span class="piccolo tenue">${usi ? `nella scheda ${usi} ${usi === 1 ? 'volta' : 'volte'}` : 'non usato nella scheda'}${e.regolazione ? ` · ⚙ ${esc(e.regolazione)}` : ''}</span>
        </span>
        <button class="bottone piccolo" data-azione="modifica-esercizio" data-esercizio="${esc(e.id)}" aria-label="Modifica ${esc(e.nome)}">Modifica</button>
      </div>`;
    }).join('')}`).join('');
  return `<h2>Lista esercizi</h2>
    <p class="tenue">Gli esercizi che puoi mettere nella scheda. Quando aggiungi un esercizio li scegli da qui, oppure ne crei uno nuovo.</p>
    <button class="bottone primario largo" data-azione="nuovo-esercizio">＋ Nuovo esercizio</button>
    <div class="lista-esercizi">${righe || '<p class="tenue">La lista è vuota.</p>'}</div>
    <div class="riga-bottoni"><button class="bottone" data-azione="chiudi-modale">Chiudi</button></div>`;
}

// Finestra per creare (esercizio = null) o modificare un esercizio della lista.
export function htmlEsercizioForm(c, esercizio = null) {
  const usi = esercizio ? usiEsercizio(esercizio.id) : 0;
  const elimina = !esercizio ? ''
    : usi ? `<p class="piccolo tenue">Per toglierlo dalla lista, prima toglilo dalla scheda (è usato ${usi} ${usi === 1 ? 'volta' : 'volte'}).</p>`
    : `<button type="button" class="bottone pericolo" data-azione="elimina-esercizio" data-esercizio="${esc(esercizio.id)}">Togli dalla lista</button>`;
  return `<h2>${esercizio ? 'Modifica esercizio' : 'Nuovo esercizio'}</h2>
    ${esercizio && usi ? '<p class="tenue">Il nome nuovo vale in tutte le settimane, comprese quelle passate.</p>' : ''}
    <form id="modulo-esercizio" ${esercizio ? `data-esercizio="${esc(esercizio.id)}"` : ''}>
      <label class="etichetta-campo">Nome
        <input class="campo largo sinistra" name="nome" maxlength="60" autocomplete="off" value="${esc(esercizio ? esercizio.nome : '')}" placeholder="es. Chest fly macchinario" required>
      </label>
      <label class="etichetta-campo"><span>Gruppo muscolare <span class="tenue">(facoltativo)</span></span>
        <input class="campo largo sinistra" name="gruppo" list="elenco-gruppi" maxlength="30" autocomplete="off" value="${esc(esercizio ? esercizio.gruppo : '')}" placeholder="es. Petto">
      </label>
      ${elencoGruppi(c)}
      <label class="etichetta-campo"><span>Regolazione macchinario <span class="tenue">(facoltativa)</span></span>
        <input class="campo largo sinistra" name="regolazione" maxlength="60" autocomplete="off" value="${esc(esercizio ? esercizio.regolazione : '')}" placeholder="es. cavi al 7, sedile 4">
      </label>
      ${elimina}
      <div class="riga-bottoni">
        <button type="button" class="bottone" data-azione="lista-esercizi">Indietro</button>
        <button type="submit" class="bottone primario">Salva</button>
      </div>
    </form>`;
}
