// Pezzi usati da più schermate.
import { dati, area, clienteAperto } from '../dati.js';
import { tema, testiPer } from '../temi.js';
import { settimane } from '../calcoli.js';
import { esc } from '../utili.js';

// Tutto quello che serve a una schermata per disegnarsi.
export function contesto() {
  const db = dati();
  const a = area(); // i tuoi dati, oppure quelli del cliente aperto se fai il coach
  const d = { ...db, esercizi: a.esercizi, programma: a.programma, checkin: a.checkin, sessioni: a.sessioni };
  const elenco = settimane(d.programma);
  const nomi = {};
  for (const e of d.esercizi) nomi[e.id] = e.nome;
  const modo = d.profilo.modalita;
  const solo = modo === 'solo';
  const allenatore = modo === 'allenatore';
  const base = tema(d.profilo.tema);
  return {
    d,
    solo,                                        // true = "mi alleno da solo": niente riferimenti al coach
    allenatore,                                  // true = "sono il coach": guardo e preparo le schede dei clienti
    cliente: allenatore ? clienteAperto() : null,
    puoModificare: solo || allenatore,           // chi può cambiare la scheda dall'app
    t: { ...base, testi: testiPer(base, modo) },
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
  const c = contesto();
  if (c.puoModificare) {
    return `<section class="scheda vuoto">
    <h2>${c.cliente ? `${esc(c.cliente.nome)} non ha ancora una scheda` : 'Non hai ancora una scheda'}</h2>
    <p>Creala da zero qui sull'app, importa un file con la scheda oppure parti da una scheda di esempio e modificala.</p>
    <div class="colonna-bottoni">
      <button class="bottone primario" data-azione="aggiungi-voce" data-settimana="1" data-giorno="1" data-nuovo-giorno="1">Crea la scheda da zero</button>
      <button class="bottone" data-azione="importa-scheda">Importa un file</button>
      <button class="bottone" data-azione="esempio">Parti dall'esempio</button>
    </div>
  </section>`;
  }
  return `<section class="scheda vuoto">
    <h2>Non hai ancora una scheda</h2>
    <p>Importa la scheda che ti ha preparato il coach, oppure prova l'app con una scheda di esempio.</p>
    <div class="riga-bottoni">
      <button class="bottone primario" data-azione="vai" data-scheda="profilo">Vai al profilo</button>
      <button class="bottone" data-azione="esempio">Scheda di esempio</button>
    </div>
  </section>`;
}
