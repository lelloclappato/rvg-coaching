// Pezzi usati da più schermate.
import { dati } from '../dati.js';
import { tema } from '../temi.js';
import { settimane } from '../calcoli.js';
import { esc } from '../utili.js';

// Tutto quello che serve a una schermata per disegnarsi.
export function contesto() {
  const d = dati();
  const elenco = settimane(d.programma);
  const nomi = {};
  for (const e of d.esercizi) nomi[e.id] = e.nome;
  return {
    d,
    t: tema(d.profilo.tema),
    idTema: d.profilo.tema,
    settimane: elenco,
    ultima: elenco.length ? elenco[elenco.length - 1] : null,
    nomi
  };
}

// Titolo di una schermata: riga piccola sopra + titolo grande.
// "decoro-titolo" è un elemento vuoto che ogni stile disegna a modo suo
// (pennellata, crepa, niente…): vedi temi.css.
export function intestazione(sopra, titolo) {
  return `<header class="intestazione">
    <p class="sopra">${esc(sopra)}</p>
    <h1>${esc(titolo)}</h1>
    <span class="decoro-titolo" aria-hidden="true"></span>
  </header>`;
}

// Schermata mostrata quando non c'è ancora nessuna scheda.
export function senzaScheda() {
  return `<section class="scheda vuoto">
    <h2>Non hai ancora una scheda</h2>
    <p>Importa la scheda che ti ha preparato Riccardo, oppure prova l'app con una scheda di esempio.</p>
    <div class="riga-bottoni">
      <button class="bottone primario" data-azione="vai" data-scheda="profilo">Vai al profilo</button>
      <button class="bottone" data-azione="esempio">Scheda di esempio</button>
    </div>
  </section>`;
}
