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

function htmlVoce(voce, indice, c) {
  const { t } = c;
  const aperta = stato.voceAperta === voce.id;
  const tutte = voce.serie.length > 0 && voce.serie.every(s => s.fatta);
  const esercizio = c.d.esercizi.find(e => e.id === voce.esercizioId);
  let corpo = '';
  if (aperta) {
    const nota = voce.notaCoach ? `<p class="nota-in-scheda"><strong>Riccardo:</strong> ${esc(voce.notaCoach)}</p>` : '';
    const video = esercizio && /^https?:\/\//.test(esercizio.video)
      ? `<a class="bottone piccolo" href="${esc(esercizio.video)}" target="_blank" rel="noopener">${icone.video} Video</a>` : '';
    corpo = `<div class="voce-corpo">
      ${nota}
      <div class="serie testata" aria-hidden="true"><span>Serie</span><span>Kg</span><span>Rip</span><span>RIR</span><span></span></div>
      ${voce.serie.map((s, i) => htmlSerie(voce, s, i, t)).join('')}
      <div data-suggerimento="${esc(voce.id)}">${htmlSuggerimento(voce, t)}</div>
      <label class="etichetta-campo" for="nota-${esc(voce.id)}">Nota per Riccardo</label>
      <textarea id="nota-${esc(voce.id)}" class="campo testo" rows="2" data-campo="nota" data-voce="${esc(voce.id)}" placeholder="Come è andata, fastidi, attrezzo diverso…">${esc(voce.notaAtleta)}</textarea>
      <div class="riga-bottoni">
        ${video}
        <button class="bottone piccolo" data-azione="modifica-voce" data-voce="${esc(voce.id)}">${icone.matita} Modifica programma</button>
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
  const pillole = giorni.map(g =>
    `<button class="pillola ${g.giorno === giorno ? 'attiva' : ''} ${g.completo ? 'fatta' : ''}" data-azione="apri-giorno" data-giorno="${g.giorno}" aria-pressed="${g.giorno === giorno}">${esc(c.t.numGiorno(g.giorno))} ${esc(g.nome)}</button>`
  ).join('');

  const riepilogo = av.fatte > 0
    ? `<button class="bottone ${info.completo ? 'primario' : ''} grande" data-azione="condividi-giorno">${icone.condividi} Manda il riepilogo a Riccardo</button>` : '';

  return `<div class="testa-allenamento">
      <div class="testa-riga">
        <div>
          <p class="sopra">Giorno ${giorno}</p>
          <h1>${esc(info ? info.nome : '')}</h1>
        </div>
        <label class="sr-only" for="scegli-settimana">Settimana</label>
        <select id="scegli-settimana" class="campo scelta" data-campo="settimana">${scelte}</select>
      </div>
      <div data-avanzamento>${htmlIndicatore(av, c.idTema)}</div>
      <div class="pillole">${pillole}</div>
    </div>
    <div class="elenco-voci">${voci.map((v, i) => htmlVoce(v, i, c)).join('')}</div>
    ${riepilogo}`;
}

// Finestra per cambiare il programma di un esercizio (serie, ripetizioni, carico…).
export function htmlModifica(voce, nome) {
  const s = voce.serie[0] || {};
  const v = x => (x === null || x === undefined ? '' : fmt(x, 2));
  return `<h2>${esc(nome)}</h2>
    <p class="tenue">Cambia quello che è in programma. Le serie già registrate restano.</p>
    <form id="modulo-modifica" data-voce="${esc(voce.id)}">
      <div class="griglia-modulo">
        <label>Serie<input class="campo" name="serie" inputmode="numeric" value="${voce.serie.length}"></label>
        <label>Kg<input class="campo" name="kgTarget" inputmode="decimal" value="${v(s.kgTarget)}"></label>
        <label>Rip min<input class="campo" name="ripMin" inputmode="numeric" value="${v(s.ripMin)}"></label>
        <label>Rip max<input class="campo" name="ripMax" inputmode="numeric" value="${v(s.ripMax)}"></label>
        <label>RIR<input class="campo" name="rirTarget" inputmode="decimal" value="${v(s.rirTarget)}"></label>
      </div>
      <label class="etichetta-campo">Nota del coach
        <textarea class="campo testo" name="notaCoach" rows="2">${esc(voce.notaCoach)}</textarea>
      </label>
      <div class="riga-bottoni">
        <button type="button" class="bottone" data-azione="chiudi-modale">Annulla</button>
        <button type="submit" class="bottone primario">Salva</button>
      </div>
    </form>`;
}
