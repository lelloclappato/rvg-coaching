// Schermata "Allenamento": la scheda del giorno, dove si registrano le serie.
import { contesto, intestazione, senzaScheda } from './comune.js';
import { stato } from '../stato.js';
import { icone } from '../icone.js';
import { avanzamento, giorniDellaSettimana, prossimoGiorno, vociDelGiorno, descriviVoce, suggerimento } from '../calcoli.js';
import { esc, fmt } from '../utili.js';

// Settimana e giorno da mostrare: quelli scelti, altrimenti l'ultima settimana
// e il primo giorno non ancora completato.
export function giornoAperto(c) {
  const settimana = c.settimane.includes(stato.settimana) ? stato.settimana : c.ultima;
  const giorni = giorniDellaSettimana(c.d.programma, settimana);
  const giorno = giorni.some(g => g.giorno === stato.giorno) ? stato.giorno : prossimoGiorno(c.d.programma, settimana);
  return { settimana, giorno, giorni };
}

// Indicatore di avanzamento: ogni stile ha il suo (barra, cerchio a pennello, nave sulla rotta).
export function htmlIndicatore(av, idTema) {
  const quota = av.totali ? av.fatte / av.totali : 0;
  const testo = `${av.fatte}/${av.totali}`;
  if (idTema === 'inchiostro') {
    const giro = 2 * Math.PI * 31;
    return `<div class="cerchio" role="img" aria-label="${av.fatte} serie fatte su ${av.totali}">
      <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
        <circle cx="38" cy="38" r="31" class="cerchio-fondo"/>
        <circle cx="38" cy="38" r="31" class="cerchio-pieno" stroke-dasharray="${(quota * giro).toFixed(1)} ${giro.toFixed(1)}"/>
      </svg><span>${testo}</span></div>`;
  }
  if (idTema === 'avventura') {
    return `<div class="rotta" role="img" aria-label="${av.fatte} serie fatte su ${av.totali}">
      <span class="rotta-conto">${testo}</span>
      <div class="rotta-linea">
        <span class="rotta-fatta" style="width: calc((100% - 24px) * ${quota.toFixed(3)})"></span>
        <span class="rotta-nave" style="left: calc((100% - 52px) * ${quota.toFixed(3)})">${icone.nave}</span>
        <span class="rotta-arrivo">${icone.stella}</span>
      </div></div>`;
  }
  return `<div class="avanzamento" role="img" aria-label="${av.fatte} serie fatte su ${av.totali}">
    <span class="avanzamento-conto">${testo} serie</span>
    <div class="barra"><span style="width: ${Math.round(quota * 100)}%"></span></div></div>`;
}

// Riga piccola sotto il nome dell'esercizio: "2×6-10 · 14 kg · RIR 1 · 1/2 fatte"
export function htmlRiassunto(voce) {
  const fatte = voce.serie.filter(s => s.fatta).length;
  return esc(descriviVoce(voce) + (fatte ? ` · ${fatte}/${voce.serie.length} fatte` : ''));
}

export function htmlSuggerimento(voce, t) {
  const s = suggerimento(voce);
  return s ? `<p class="suggerimento ${s}">${esc(t.testi[s])}</p>` : '';
}

function htmlSerie(voce, s, i, t) {
  const n = i + 1;
  const segnaposto = (v, alt = '–') => (v === null || v === undefined ? alt : fmt(v));
  const rip = s.ripMin === null ? '–' : s.ripMax > s.ripMin ? `${s.ripMin}-${s.ripMax}` : `${s.ripMin}`;
  const campo = (nome, valore, hint, etichetta, modo) =>
    `<input class="campo" inputmode="${modo}" autocomplete="off" data-campo="${nome}" data-voce="${esc(voce.id)}" data-serie="${i}"
      value="${valore === null || valore === undefined ? '' : fmt(valore, 2)}" placeholder="${esc(hint)}" aria-label="${etichetta} serie ${n}">`;
  return `<div class="serie ${s.fatta ? 'fatta' : ''}">
    <span class="serie-numero">${esc(t.numSerie(n))}</span>
    ${campo('kg', s.kg, segnaposto(s.kgTarget), 'Kg', 'decimal')}
    ${campo('rip', s.rip, rip, 'Ripetizioni', 'numeric')}
    ${campo('rir', s.rir, segnaposto(s.rirTarget), 'RIR', 'decimal')}
    <button class="spunta" data-azione="spunta" data-voce="${esc(voce.id)}" data-serie="${i}" aria-pressed="${s.fatta}"
      aria-label="${s.fatta ? `Serie ${n} fatta: tocca per annullare` : `Segna serie ${n} come fatta`}">${s.fatta ? (t.segnoFatto === '✓' ? icone.spunta : esc(t.segnoFatto)) : icone.spunta}</button>
  </div>`;
}

// In modalità "Modifica scheda" ogni esercizio diventa una riga con i comandi per
// spostarlo, cambiarlo o toglierlo (le serie non si registrano finché non tocchi "Fine").
function htmlVoceInModifica(voce, indice, totale, c) {
  const id = esc(voce.id);
  const nome = esc(c.nomi[voce.esercizioId] || 'Esercizio');
  return `<article class="voce in-modifica">
    <div class="voce-testa">
      <span class="voce-numero">${esc(c.t.numSerie(indice + 1))}</span>
      <span class="voce-testi">
        <span class="voce-nome">${nome}</span>
        <span class="voce-riassunto">${htmlRiassunto(voce)}</span>
      </span>
    </div>
    <div class="comandi-voce">
      <button class="bottone piccolo" data-azione="sposta-voce" data-voce="${id}" data-direzione="-1" ${indice === 0 ? 'disabled' : ''} aria-label="Sposta su ${nome}">↑</button>
      <button class="bottone piccolo" data-azione="sposta-voce" data-voce="${id}" data-direzione="1" ${indice === totale - 1 ? 'disabled' : ''} aria-label="Sposta giù ${nome}">↓</button>
      <button class="bottone piccolo" data-azione="modifica-voce" data-voce="${id}">${icone.matita} Modifica</button>
      <button class="bottone piccolo pericolo" data-azione="elimina-voce" data-voce="${id}" aria-label="Togli ${nome}">Togli</button>
    </div>
  </article>`;
}

function htmlVoce(voce, indice, c) {
  const { t } = c;
  const aperta = stato.voceAperta === voce.id;
  const tutte = voce.serie.length > 0 && voce.serie.every(s => s.fatta);
  const esercizio = c.d.esercizi.find(e => e.id === voce.esercizioId);
  let corpo = '';
  if (aperta) {
    const nota = voce.notaCoach ? `<p class="nota-in-scheda"><strong>${esc(t.testi.notaScheda)}</strong> ${esc(voce.notaCoach)}</p>` : '';
    const video = esercizio && /^https?:\/\//.test(esercizio.video)
      ? `<a class="bottone piccolo" href="${esc(esercizio.video)}" target="_blank" rel="noopener">${icone.video} Video</a>` : '';
    corpo = `<div class="voce-corpo">
      ${nota}
      <div class="serie testata" aria-hidden="true"><span>Serie</span><span>Kg</span><span>Rip</span><span>RIR</span><span></span></div>
      ${voce.serie.map((s, i) => htmlSerie(voce, s, i, t)).join('')}
      <div data-suggerimento="${esc(voce.id)}">${htmlSuggerimento(voce, t)}</div>
      <label class="etichetta-campo" for="nota-${esc(voce.id)}">${esc(t.testi.notaAtleta)}</label>
      <textarea id="nota-${esc(voce.id)}" class="campo testo" rows="2" data-campo="nota" data-voce="${esc(voce.id)}" placeholder="Come è andata, fastidi, attrezzo diverso…">${esc(voce.notaAtleta)}</textarea>
      <div class="riga-bottoni">
        ${video}
        <button class="bottone piccolo" data-azione="modifica-voce" data-voce="${esc(voce.id)}">${icone.matita} Modifica</button>
      </div>
    </div>`;
  }
  return `<article class="voce ${aperta ? 'aperta' : ''} ${tutte ? 'completa' : ''}">
    <button class="voce-testa" data-azione="apri-voce" data-voce="${esc(voce.id)}" aria-expanded="${aperta}">
      <span class="voce-numero">${tutte ? (t.segnoFatto === '✓' ? '✓' : esc(t.segnoFatto)) : esc(t.numSerie(indice + 1))}</span>
      <span class="voce-testi">
        <span class="voce-nome">${esc(c.nomi[voce.esercizioId] || 'Esercizio')}</span>
        <span class="voce-riassunto" data-riassunto="${esc(voce.id)}">${htmlRiassunto(voce)}</span>
      </span>
      <span class="voce-freccia" aria-hidden="true">${aperta ? '−' : '+'}</span>
    </button>${corpo}
  </article>`;
}

export function vistaAllenamento() {
  const c = contesto();
  if (c.ultima === null) return intestazione('RVG Coaching', 'Allenamento') + senzaScheda();
  const { settimana, giorno, giorni } = giornoAperto(c);
  const voci = vociDelGiorno(c.d.programma, settimana, giorno);
  const info = giorni.find(g => g.giorno === giorno);
  const av = avanzamento(voci);

  const scelte = c.settimane.map(s => `<option value="${s}" ${s === settimana ? 'selected' : ''}>Settimana ${s}</option>`).join('');
  const inModifica = c.solo && stato.modifica; // l'editor della scheda c'è solo in modalità "da solo"
  const nuovoNumero = giorni.reduce((m, g) => Math.max(m, g.giorno), 0) + 1;
  const pillole = giorni.map(g =>
    `<button class="pillola ${g.giorno === giorno ? 'attiva' : ''} ${g.completo ? 'fatta' : ''}" data-azione="apri-giorno" data-giorno="${g.giorno}" aria-pressed="${g.giorno === giorno}">${esc(c.t.numGiorno(g.giorno))} ${esc(g.nome)}</button>`
  ).join('') + (inModifica
    ? `<button class="pillola aggiungi" data-azione="aggiungi-voce" data-settimana="${settimana}" data-giorno="${nuovoNumero}" data-nuovo-giorno="1">+ Giorno</button>` : '');

  const riepilogo = av.fatte > 0 && !inModifica
    ? `<button class="bottone ${info.completo ? 'primario' : ''} grande" data-azione="condividi-giorno">${icone.condividi} ${esc(c.t.testi.condividiGiorno)}</button>` : '';

  // comandi del giorno, visibili solo in "Modifica scheda"
  const comandiGiorno = inModifica ? `<div class="colonna-bottoni">
      <button class="bottone primario grande" data-azione="aggiungi-voce" data-settimana="${settimana}" data-giorno="${giorno}">+ Aggiungi esercizio</button>
      <div class="riga-bottoni">
        <button class="bottone piccolo" data-azione="rinomina-giorno" data-settimana="${settimana}" data-giorno="${giorno}">Rinomina giorno</button>
        <button class="bottone piccolo pericolo" data-azione="elimina-giorno" data-settimana="${settimana}" data-giorno="${giorno}">Elimina giorno</button>
      </div>
      <p class="tenue piccolo">Le modifiche valgono solo per la settimana ${settimana}. Per la settimana dopo: Profilo → Nuova settimana (copia questa).</p>
    </div>` : '';

  return `<div class="testa-allenamento">
      <div class="testa-riga">
        <div>
          <p class="sopra">Giorno ${giorno}</p>
          <h1>${esc(info ? info.nome : '')}</h1>
        </div>
        <div class="colonna-destra">
          <label class="sr-only" for="scegli-settimana">Settimana</label>
          <select id="scegli-settimana" class="campo scelta" data-campo="settimana">${scelte}</select>
          ${c.solo ? `<button class="bottone piccolo ${inModifica ? 'primario' : ''}" data-azione="modifica-scheda" aria-pressed="${inModifica}">${inModifica ? '✓ Fine' : `${icone.matita} Modifica scheda`}</button>` : ''}
        </div>
      </div>
      ${inModifica ? '' : `<div data-avanzamento>${htmlIndicatore(av, c.idTema)}</div>`}
      <div class="pillole">${pillole}</div>
    </div>
    <div class="elenco-voci">${voci.map((v, i) => (inModifica ? htmlVoceInModifica(v, i, voci.length, c) : htmlVoce(v, i, c))).join('')}</div>
    ${comandiGiorno}
    ${riepilogo}`;
}

// Elenco dei nomi degli esercizi già usati: il campo "Esercizio" li suggerisce mentre scrivi.
function elencoEsercizi(c) {
  const nomi = [...c.d.esercizi].map(e => e.nome).sort((a, b) => a.localeCompare(b, 'it'));
  return `<datalist id="elenco-esercizi">${nomi.map(n => `<option value="${esc(n)}"></option>`).join('')}</datalist>`;
}

const valore = x => (x === null || x === undefined ? '' : fmt(x, 2));

// I campi del programma (uguali per "Modifica" e "Aggiungi").
function campiProgramma(s, quanteSerie) {
  return `<div class="griglia-modulo">
        <label>Serie<input class="campo" name="serie" inputmode="numeric" value="${quanteSerie}"></label>
        <label>Kg<input class="campo" name="kgTarget" inputmode="decimal" value="${valore(s.kgTarget)}"></label>
        <label>Rip min<input class="campo" name="ripMin" inputmode="numeric" value="${valore(s.ripMin)}"></label>
        <label>Rip max<input class="campo" name="ripMax" inputmode="numeric" value="${valore(s.ripMax)}"></label>
        <label>RIR<input class="campo" name="rirTarget" inputmode="decimal" value="${valore(s.rirTarget)}"></label>
      </div>`;
}

// Finestra per aggiungere un esercizio (e, se serve, un giorno nuovo).
export function htmlAggiungi(c, settimana, giorno, nuovoGiorno) {
  const nomeSuggerito = nuovoGiorno ? `Giorno ${giorno}` : '';
  return `<h2>${nuovoGiorno ? 'Nuovo giorno' : 'Aggiungi esercizio'}</h2>
    <p class="tenue">Settimana ${settimana} · giorno ${giorno}. Scrivi il nome: se l'esercizio c'è già lo riconosco, altrimenti lo creo.</p>
    <form id="modulo-aggiungi" data-settimana="${settimana}" data-giorno="${giorno}">
      ${nuovoGiorno ? `<label class="etichetta-campo">Nome del giorno
        <input class="campo largo sinistra" name="nomeGiorno" maxlength="30" value="${esc(nomeSuggerito)}" placeholder="es. Petto e tricipiti">
      </label>` : ''}
      <label class="etichetta-campo">Esercizio
        <input class="campo largo sinistra" name="esercizio" list="elenco-esercizi" maxlength="60" autocomplete="off" placeholder="es. Panca piana" required>
      </label>
      ${elencoEsercizi(c)}
      ${campiProgramma({ kgTarget: null, ripMin: 8, ripMax: 12, rirTarget: 1 }, 3)}
      <label class="etichetta-campo">${esc(c.t.testi.campoNotaCoach)}
        <textarea class="campo testo" name="notaCoach" rows="2" placeholder="es. scapole addotte, discesa lenta"></textarea>
      </label>
      <div class="riga-bottoni">
        <button type="button" class="bottone" data-azione="chiudi-modale">Annulla</button>
        <button type="submit" class="bottone primario">Aggiungi</button>
      </div>
    </form>`;
}

// Finestra per rinominare un giorno.
export function htmlRinomina(settimana, giorno, nome) {
  return `<h2>Rinomina giorno</h2>
    <form id="modulo-rinomina" data-settimana="${settimana}" data-giorno="${giorno}">
      <label class="etichetta-campo">Nome del giorno
        <input class="campo largo sinistra" name="nomeGiorno" maxlength="30" value="${esc(nome)}" required>
      </label>
      <div class="riga-bottoni">
        <button type="button" class="bottone" data-azione="chiudi-modale">Annulla</button>
        <button type="submit" class="bottone primario">Salva</button>
      </div>
    </form>`;
}

// Finestra per cambiare il programma di un esercizio (serie, ripetizioni, carico…)
// o per sostituirlo con un altro esercizio.
export function htmlModifica(voce, nome, c) {
  const s = voce.serie[0] || {};
  return `<h2>${esc(nome)}</h2>
    <p class="tenue">Cambia quello che è in programma. Le serie già registrate restano.</p>
    <form id="modulo-modifica" data-voce="${esc(voce.id)}">
      <label class="etichetta-campo">Esercizio
        <input class="campo largo sinistra" name="esercizio" list="elenco-esercizi" maxlength="60" autocomplete="off" value="${esc(nome)}" required>
      </label>
      ${elencoEsercizi(c)}
      ${campiProgramma(s, voce.serie.length)}
      <label class="etichetta-campo">${esc(c.t.testi.campoNotaCoach)}
        <textarea class="campo testo" name="notaCoach" rows="2">${esc(voce.notaCoach)}</textarea>
      </label>
      <div class="riga-bottoni">
        <button type="button" class="bottone" data-azione="chiudi-modale">Annulla</button>
        <button type="submit" class="bottone primario">Salva</button>
      </div>
    </form>`;
}
