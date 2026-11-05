// Schermata "Oggi": cosa c'è da fare e come sta andando.
import { contesto, intestazione, senzaScheda } from './comune.js';
import { giorniDellaSettimana, prossimoGiorno, vociDelGiorno, descriviVoce, storicoEsercizio, orologio } from '../calcoli.js';
import { sessione } from '../dati.js';
import { esc, fmt } from '../utili.js';

export function vistaOggi() {
  const c = contesto();
  const { d, t } = c;
  if (c.ultima === null) return intestazione('RVG Coaching', t.testi.saluto(d.profilo.nome)) + senzaScheda();

  const giorni = giorniDellaSettimana(d.programma, c.ultima);
  const giornoOggi = prossimoGiorno(d.programma, c.ultima);
  const info = giorni.find(g => g.giorno === giornoOggi);
  const voci = vociDelGiorno(d.programma, c.ultima, giornoOggi);

  // striscia dei giorni della settimana
  const striscia = giorni.map(g => {
    const classe = g.giorno === giornoOggi ? 'attuale' : g.completo ? 'fatto' : '';
    const stato = g.completo ? 'fatto' : g.giorno === giornoOggi ? 'oggi' : '';
    return `<button class="giorno ${classe}" data-azione="apri-giorno" data-giorno="${g.giorno}" aria-label="Giorno ${g.giorno} ${esc(g.nome)}${g.completo ? ', completato' : ''}">
      <span class="giorno-stato">${stato}</span>
      <span class="giorno-numero">${esc(t.numGiorno(g.giorno))}</span>
      <span class="giorno-nome">${esc(g.nome)}</span>
    </button>`;
  }).join('');

  // scheda dell'allenamento di oggi
  const prime = voci.slice(0, 3).map(v =>
    `<div class="riga-esercizio"><span>${esc(c.nomi[v.esercizioId])}</span><span class="tenue">${esc(descriviVoce(v))}</span></div>`
  ).join('');
  const altre = voci.length > 3 ? `<p class="tenue piccolo">+ altri ${voci.length - 3} esercizi</p>` : '';
  const etichettaBottone = info.completo ? t.testi.rivedi : info.fatte > 0 ? t.testi.continua : t.testi.inizia;
  const avanz = info.fatte > 0 ? ` · ${info.fatte}/${info.totali} fatte` : '';
  const x = sessione(c.ultima, giornoOggi);
  const timer = x && x.fine === null
    ? ` · ⏱ <span data-timer data-inizio="${x.inizio}">${orologio(Date.now() - x.inizio)}</span>` : '';

  // nota del coach: la prima che si trova negli esercizi di oggi
  const conNota = voci.find(v => v.notaCoach);
  const nota = conNota ? `<section class="nota-coach">
      <span class="sigillo" aria-hidden="true">${esc(c.solo ? (d.profilo.nome.trim()[0] || '★').toUpperCase() : 'R')}</span>
      <div><p class="nota-titolo">${esc(t.testi.notaCoach)}</p><p>${esc(conNota.notaCoach)}</p></div>
    </section>` : '';

  // forza stimata del primo esercizio di oggi
  let tesseraForza = '';
  if (voci[0]) {
    const storia = storicoEsercizio(d.programma, voci[0].esercizioId).filter(r => r.e1rm !== null);
    if (storia.length) {
      const adesso = storia[storia.length - 1].e1rm, prima = storia[0].e1rm;
      const delta = storia.length > 1 ? Math.round((adesso / prima - 1) * 100) : null;
      const segno = delta === null ? '' : `${delta >= 0 ? '+' : ''}${delta}% da settimana ${storia[0].settimana}`;
      tesseraForza = `<button class="tessera" data-azione="apri-progressi" data-esercizio="${esc(voci[0].esercizioId)}">
        <span class="tenue piccolo">${esc(c.nomi[voci[0].esercizioId])} · forza stimata</span>
        <span class="numero-grande">${fmt(adesso)} kg</span>
        <span class="piccolo accento">${esc(segno)}</span>
      </button>`;
    }
  }

  const fatto = d.checkin.some(x => x.settimana === c.ultima);
  const tesseraCheckin = `<button class="tessera" data-azione="vai" data-scheda="checkin">
      <span class="tenue piccolo">${esc(t.testi.titoloCheckin)} settimana ${c.ultima}</span>
      <span class="numero-grande">${fatto ? 'Fatto' : 'Da fare'}</span>
      <span class="piccolo ${fatto ? 'positivo' : 'avviso'}">${fatto ? 'Puoi ancora modificarlo' : 'Un minuto, a fine settimana'}</span>
    </button>`;

  return `${intestazione(t.testi.sottotitolo(c.ultima), t.testi.saluto(d.profilo.nome))}
    <div class="striscia-giorni" style="grid-template-columns: repeat(${giorni.length}, minmax(0, 1fr))">${striscia}</div>
    <section class="scheda in-evidenza">
      <p class="etichetta">${esc(t.testi.etichettaOggi)}</p>
      <h2>Giorno ${giornoOggi} · ${esc(info.nome)}</h2>
      <p class="tenue">${info.esercizi} esercizi · ${info.totali} serie${avanz}${timer}</p>
      <div class="elenco-esercizi">${prime}${altre}</div>
      <button class="bottone primario grande" data-azione="apri-giorno" data-giorno="${giornoOggi}">${esc(etichettaBottone)}</button>
    </section>
    ${nota}
    <div class="due-tessere">${tesseraForza}${tesseraCheckin}</div>`;
}
