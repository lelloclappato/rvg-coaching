// Schermata "Check-in": una volta a settimana, come sta andando fuori dalla palestra.
import { contesto, intestazione, senzaScheda } from './comune.js';
import { stato } from '../stato.js';
import { icone } from '../icone.js';
import { esc, fmt, dataBreve } from '../utili.js';

const VOTI = [
  { campo: 'sonno', nome: 'Sonno', scala: '1 pessimo · 5 ottimo' },
  { campo: 'energia', nome: 'Energia in palestra', scala: '1 · 5' },
  { campo: 'stress', nome: 'Stress', scala: '1 basso · 5 alto' },
  { campo: 'dieta', nome: 'Alimentazione rispettata', scala: '1 · 5' }
];

// La "bozza" è il check-in mentre lo stai compilando: parte da quello già salvato
// per la settimana (se c'è), altrimenti vuota.
export function bozza(c) {
  const settimana = c.ultima;
  if (!stato.bozzaCheckin || stato.bozzaCheckin.settimana !== settimana) {
    const salvato = c.d.checkin.find(x => x.settimana === settimana);
    stato.bozzaCheckin = salvato
      ? { ...salvato, peso: salvato.peso === null ? '' : fmt(salvato.peso, 2) }
      : { settimana, peso: '', sonno: null, energia: null, stress: null, dieta: null, fastidi: '', note: '' };
    stato.checkinSalvato = !!salvato;
  }
  return stato.bozzaCheckin;
}

// Testo del check-in da mandare a Riccardo.
export function riepilogoCheckin(b) {
  const v = x => (x === null || x === undefined || x === '' ? '–' : x);
  return [
    `Check-in settimana ${b.settimana}`,
    `Peso medio: ${v(b.peso)} kg`,
    `Sonno ${v(b.sonno)}/5 · Energia ${v(b.energia)}/5 · Stress ${v(b.stress)}/5 · Alimentazione ${v(b.dieta)}/5`,
    b.fastidi ? `Fastidi: ${b.fastidi}` : '',
    b.note ? `Note: ${b.note}` : ''
  ].filter(Boolean).join('\n');
}

export function vistaCheckin() {
  const c = contesto();
  const { d, t } = c;
  if (c.ultima === null) return intestazione('RVG Coaching', t.testi.titoloCheckin) + senzaScheda();
  const b = bozza(c);

  const voti = VOTI.map(v => `<div class="voto">
      <div class="voto-testa"><span class="forte">${v.nome}</span><span class="tenue piccolo">${v.scala}</span></div>
      <div class="voto-bottoni" role="group" aria-label="${v.nome}">
        ${[1, 2, 3, 4, 5].map(n => `<button class="voto-bottone ${b[v.campo] === n ? 'scelto' : ''}" data-azione="voto" data-campo="${v.campo}" data-voto="${n}" aria-pressed="${b[v.campo] === n}" aria-label="${v.nome} ${n}">${esc(c.idTema === 'dark' ? ['I', 'II', 'III', 'IV', 'V'][n - 1] : n)}</button>`).join('')}
      </div></div>`).join('');

  const storico = d.checkin.filter(x => x.settimana !== b.settimana).slice(-5).reverse().map(x =>
    `<div class="riga-storia"><span class="tenue">Sett. ${x.settimana} · ${esc(dataBreve(x.data))}</span>
      <span>${x.peso === null ? '' : `<strong>${fmt(x.peso)} kg</strong> · `}sonno ${x.sonno ?? '–'} · energia ${x.energia ?? '–'}</span></div>`).join('');

  return `${intestazione(`Settimana ${b.settimana} · 1 minuto`, t.testi.titoloCheckin)}
    <section class="scheda">
      <label class="etichetta-campo" for="peso">Peso medio della settimana</label>
      <div class="riga-campo"><input id="peso" class="campo largo" inputmode="decimal" autocomplete="off" data-campo="checkin-peso" value="${esc(b.peso)}" placeholder="es. 78,4"><span class="tenue">kg</span></div>
    </section>
    <section class="scheda voti">${voti}</section>
    <section class="scheda">
      <label class="etichetta-campo" for="fastidi">Fastidi o dolori</label>
      <textarea id="fastidi" class="campo testo" rows="2" data-campo="checkin-fastidi" placeholder="es. leggero fastidio al polso destro sulla panca">${esc(b.fastidi)}</textarea>
      <label class="etichetta-campo" for="note">Altro da dire a Riccardo</label>
      <textarea id="note" class="campo testo" rows="2" data-campo="checkin-note" placeholder="es. settimana pesante al lavoro">${esc(b.note)}</textarea>
    </section>
    <button class="bottone primario grande ${stato.checkinSalvato ? 'salvato' : ''}" data-azione="salva-checkin">${esc(stato.checkinSalvato ? t.testi.inviato : 'Salva check-in')}</button>
    ${stato.checkinSalvato ? `<button class="bottone grande" data-azione="condividi-checkin">${icone.condividi} ${esc(t.testi.invia)}</button>` : ''}
    ${storico ? `<h2 class="titolo-sezione">Settimane precedenti</h2><section class="scheda elenco-storia">${storico}</section>` : ''}`;
}
