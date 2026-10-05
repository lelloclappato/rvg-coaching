// Schermata "Progressi": forza stimata di un esercizio, settimana per settimana.
import { contesto, intestazione, senzaScheda } from './comune.js';
import { stato } from '../stato.js';
import { storicoEsercizio, eserciziPerFrequenza } from '../calcoli.js';
import { esc, fmt } from '../utili.js';

// Disegna il grafico come SVG. Le misure sono in "unità del disegno" (viewBox 326×190):
// il browser poi lo allarga o stringe per riempire lo spazio disponibile.
function grafico(storia, idTema, testi) {
  const punti = storia.filter(r => r.e1rm !== null);
  if (!punti.length) return '<p class="tenue">Non ci sono ancora dati per questo esercizio.</p>';
  const valori = punti.map(p => p.e1rm);
  const settMin = punti[0].settimana, settMax = punti[punti.length - 1].settimana;
  // scala verticale: dal minimo al massimo, con un po' di margine, arrotondata a multipli di 5
  let basso = Math.floor((Math.min(...valori) - 3) / 5) * 5;
  let alto = Math.ceil((Math.max(...valori) + 3) / 5) * 5;
  if (alto - basso < 10) { alto += 5; basso -= 5; }
  const X = s => (settMax === settMin ? 173 : 28 + (s - settMin) * (294 / (settMax - settMin)));
  const Y = v => 10 + (alto - v) / (alto - basso) * 156;
  const linea = punti.map(p => `${X(p.settimana).toFixed(1)},${Y(p.e1rm).toFixed(1)}`).join(' ');

  const righe = [alto, (alto + basso) / 2, basso].map(v =>
    `<line x1="28" y1="${Y(v).toFixed(1)}" x2="322" y2="${Y(v).toFixed(1)}" class="griglia"/>
     <text x="0" y="${(Y(v) + 4).toFixed(1)}" class="asse">${fmt(v, 0)}</text>`).join('');

  const record = punti.reduce((a, b) => (b.e1rm > a.e1rm ? b : a));
  const ultimo = punti[punti.length - 1];
  const rx = X(record.settimana), ry = Y(record.e1rm);
  // il segno del record cambia con lo stile: cerchio, timbro, triangolo o "X del tesoro"
  let segno;
  if (idTema === 'avventura') {
    segno = `<path d="M${rx - 6} ${ry - 6}L${rx + 6} ${ry + 6}M${rx + 6} ${ry - 6}L${rx - 6} ${ry + 6}" class="segno-record linea"/>`;
  } else if (idTema === 'inchiostro') {
    segno = `<rect x="${rx - 7}" y="${ry - 7}" width="14" height="14" transform="rotate(-8 ${rx} ${ry})" class="segno-record"/>`;
  } else if (idTema === 'dark') {
    segno = `<polygon points="${rx},${ry - 8} ${rx + 7},${ry + 5} ${rx - 7},${ry + 5}" class="segno-record"/>`;
  } else {
    segno = `<circle cx="${rx}" cy="${ry}" r="5" class="segno-record"/>`;
  }
  const meta = Math.round((settMin + settMax) / 2);
  const centro = settMax - settMin >= 4 ? `<text x="${X(meta).toFixed(1)}" y="186" class="asse" text-anchor="middle">${meta}</text>` : '';
  const fine = settMax > settMin ? `<text x="322" y="186" class="asse" text-anchor="end">${settMax}</text>` : '';

  return `<svg class="grafico" viewBox="0 0 326 190" role="img" aria-label="Forza stimata dalla settimana ${settMin} alla ${settMax}: da ${fmt(punti[0].e1rm)} a ${fmt(ultimo.e1rm)} kg">
      ${righe}
      <text x="28" y="186" class="asse">sett. ${settMin}</text>${centro}${fine}
      ${punti.length > 1 ? `<polyline points="${linea}" class="linea-grafico"/>` : ''}
      ${segno}
      <circle cx="${X(ultimo.settimana).toFixed(1)}" cy="${Y(ultimo.e1rm).toFixed(1)}" r="5" class="segno-oggi"/>
    </svg>
    <p class="legenda"><span class="punto record"></span>Record: ${fmt(record.e1rm)} kg (sett. ${record.settimana})
      <span class="punto oggi"></span>${esc(testi.seiQui)}</p>`;
}

export function vistaProgressi() {
  const c = contesto();
  const { d, t } = c;
  if (c.ultima === null) return intestazione('RVG Coaching', t.testi.titoloProgressi) + senzaScheda();

  const perFrequenza = eserciziPerFrequenza(d.programma);
  const scelto = perFrequenza.includes(stato.esercizioProgressi) ? stato.esercizioProgressi : perFrequenza[0];
  const storia = storicoEsercizio(d.programma, scelto);
  const conDato = storia.filter(r => r.e1rm !== null);

  // i 4 esercizi più frequenti come pillole, tutti gli altri nel menu
  const pillole = perFrequenza.slice(0, 4).map(id =>
    `<button class="pillola ${id === scelto ? 'attiva' : ''}" data-azione="scegli-esercizio" data-esercizio="${esc(id)}" aria-pressed="${id === scelto}">${esc(c.nomi[id])}</button>`).join('');
  const opzioni = [...perFrequenza].sort((a, b) => c.nomi[a].localeCompare(c.nomi[b], 'it'))
    .map(id => `<option value="${esc(id)}" ${id === scelto ? 'selected' : ''}>${esc(c.nomi[id])}</option>`).join('');

  let numeri = '';
  if (conDato.length) {
    const primo = conDato[0], ultimo = conDato[conDato.length - 1];
    const record = conDato.reduce((a, b) => (b.e1rm > a.e1rm ? b : a));
    const delta = conDato.length > 1 ? Math.round((ultimo.e1rm / primo.e1rm - 1) * 100) : null;
    numeri = `<section class="scheda in-evidenza">
        <div class="testa-grafico">
          <div><p class="tenue piccolo">Forza stimata (e1RM)</p><p class="numero-enorme">${fmt(ultimo.e1rm)} kg</p></div>
          ${delta === null ? '' : `<p class="accento forte">${delta >= 0 ? '+' : ''}${delta}% da sett. ${primo.settimana}</p>`}
        </div>
        ${grafico(storia, c.idTema, t.testi)}
      </section>
      <div class="due-tessere">
        <div class="tessera"><span class="tenue piccolo">${esc(t.testi.inizio)} (sett. ${primo.settimana})</span><span class="numero-grande">${fmt(primo.e1rm)} kg</span></div>
        <div class="tessera"><span class="tenue piccolo">${esc(t.testi.record)}</span><span class="numero-grande record">${fmt(record.e1rm)} kg</span></div>
      </div>`;
  } else {
    numeri = '<section class="scheda"><p class="tenue">Non ci sono ancora dati per questo esercizio.</p></section>';
  }

  const ultime = storia.slice(-5).reverse().map(r =>
    `<div class="riga-storia"><span class="tenue">Settimana ${r.settimana}</span>
      <span><strong>${esc(r.descrizione)}</strong>${r.registrate ? ` <span class="tenue piccolo">· ${r.registrate}/${r.serie} registrate</span>` : ''}</span></div>`).join('');
  const nonRegistrate = storia.some(r => r.registrate < r.serie);

  return `${intestazione(t.testi.sopraProgressi(c.settimane.length), t.testi.titoloProgressi)}
    <div class="pillole">${pillole}</div>
    <label class="sr-only" for="scegli-esercizio">Esercizio</label>
    <select id="scegli-esercizio" class="campo scelta larga" data-campo="esercizio">${opzioni}</select>
    ${numeri}
    <section class="scheda elenco-storia">${ultime}</section>
    ${nonRegistrate ? '<p class="tenue piccolo">Dove le serie non sono registrate, la forza stimata è calcolata sul carico in programma.</p>' : ''}`;
}
