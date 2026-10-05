// La finestra che compare sopra l'app: per chiedere conferma o per modificare un esercizio.
import { esc } from '../utili.js';

const contenitore = () => document.getElementById('modale');
let chiudiCon = null; // funzione da chiamare quando la finestra si chiude

export function chiudiModale(risultato = null) {
  contenitore().innerHTML = '';
  document.body.classList.remove('con-modale');
  const f = chiudiCon;
  chiudiCon = null;
  if (f) f(risultato);
}

// Mostra una finestra con dell'HTML dentro. Restituisce una Promise che si completa
// quando la finestra viene chiusa (con il valore passato a chiudiModale).
export function apriModale(html) {
  if (chiudiCon) chiudiModale(null);
  contenitore().innerHTML = `<div class="velo" data-azione="chiudi-modale"></div>
    <div class="finestra" role="dialog" aria-modal="true">${html}</div>`;
  document.body.classList.add('con-modale');
  const primo = contenitore().querySelector('input, textarea, button.primario');
  if (primo) primo.focus();
  return new Promise(risolvi => { chiudiCon = risolvi; });
}

// Chiede conferma prima di un'azione che non si può annullare. Restituisce true o false.
export async function conferma(titolo, testo, etichetta = 'Conferma') {
  const esito = await apriModale(`
    <h2>${esc(titolo)}</h2>
    <p>${esc(testo)}</p>
    <div class="riga-bottoni">
      <button class="bottone" data-azione="chiudi-modale">Annulla</button>
      <button class="bottone pericolo" data-azione="conferma-modale">${esc(etichetta)}</button>
    </div>`);
  return esito === true;
}
