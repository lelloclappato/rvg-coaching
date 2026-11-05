// Pezzi usati da più schermate.
import { dati } from '../dati.js';
import { tema, testiPer } from '../temi.js';
import { settimane } from '../calcoli.js';
import { esc } from '../utili.js';

// Tutto quello che serve a una schermata per disegnarsi.
export function contesto() {
  const d = dati();
  const elenco = settimane(d.programma);
  const nomi = {};
  for (const e of d.esercizi) nomi[e.id] = e.nome;
  const solo = d.profilo.modalita === 'solo';
  const base = tema(d.profilo.tema);
  return {
    d,
    solo,                                        // true = "mi alleno da solo": niente riferimenti al coach
    t: { ...base, testi: testiPer(base, solo) },
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
  if (contesto().solo) {
    return `<section class="scheda vuoto">
    <h2>Non hai ancora una scheda</h2>
    <p>Creala da zero qui sull'app, importa un file preparato con Claude oppure parti da una scheda di esempio e modificala.</p>
    <div class="colonna-bottoni">
      <button class="bottone primario" data-azione="aggiungi-voce" data-settimana="1" data-giorno="1" data-nuovo-giorno="1">Crea la scheda da zero</button>
      <button class="bottone" data-azione="importa-scheda">Importa un file</button>
      <button class="bottone" data-azione="esempio">Parti dall'esempio</button>
    </div>
  </section>`;
  }
  return `<section class="scheda vuoto">
    <h2>Non hai ancora una scheda</h2>
    <p>Importa la scheda che ti ha preparato Riccardo, oppure prova l'app con una scheda di esempio.</p>
    <div class="riga-bottoni">
      <button class="bottone primario" data-azione="vai" data-scheda="profilo">Vai al profilo</button>
      <button class="bottone" data-azione="esempio">Scheda di esempio</button>
    </div>
  </section>`;
}
