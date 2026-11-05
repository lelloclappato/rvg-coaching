// Prove automatiche dei calcoli (js/calcoli.js).
// Si lanciano dal computer con:  node tests/calcoli.test.js
// oppure aprendo tests/test.html nel browser.
// Ogni prova confronta il risultato di una funzione con quello atteso, calcolato a mano.
import {
  e1rm, e1rmSerie, volumeSerie, avanzamento, suggerimento, settimane,
  giorniDellaSettimana, prossimoGiorno, storicoEsercizio, descriviVoce, riepilogoGiorno, orologio, durataBreve
} from '../js/calcoli.js';
import { numero, fmt } from '../js/utili.js';

let passate = 0;
const fallite = [];
function prova(nome, ottenuto, atteso) {
  const uguali = JSON.stringify(ottenuto) === JSON.stringify(atteso);
  if (uguali) passate++;
  else fallite.push(`${nome}: atteso ${JSON.stringify(atteso)}, ottenuto ${JSON.stringify(ottenuto)}`);
}
const circa = x => (x === null ? null : Math.round(x * 10) / 10);

// una serie con i valori dati (il resto vuoto)
const serie = (s = {}) => ({ ripMin: null, ripMax: null, rirTarget: null, kgTarget: null, kg: null, rip: null, rir: null, fatta: false, ...s });
const voce = (v = {}) => ({ id: 'v', settimana: 1, giorno: 1, nomeGiorno: 'Upper', ordine: 0, esercizioId: 'panca', notaCoach: '', notaAtleta: '', serie: [], ...v });

// --- e1RM ---
prova('e1rm 95×4 RIR 2', circa(e1rm(95, 4, 2)), 114);
prova('e1rm senza RIR', circa(e1rm(100, 5)), 116.7);
prova('e1rm con kg 0', e1rm(0, 5), null);
prova('e1rm con 0 ripetizioni', e1rm(100, 0), null);
prova('e1rm serie registrata', circa(e1rmSerie(serie({ kgTarget: 90, ripMin: 5, ripMax: 5, kg: 95, rip: 4, rir: 2, fatta: true }))), 114);
prova('e1rm serie non registrata usa il programma', circa(e1rmSerie(serie({ kgTarget: 90, ripMin: 5, ripMax: 5, rirTarget: 1 }))), 108);
prova('e1rm serie fallita non conta', e1rmSerie(serie({ kgTarget: 100, ripMin: 1, ripMax: 1, kg: 100, rip: 0, fatta: true })), null);
prova('e1rm serie senza carico', e1rmSerie(serie({ ripMin: 5, ripMax: 5 })), null);

// --- volume ---
prova('volume registrato', volumeSerie(serie({ kg: 50, rip: 8, fatta: true })), 400);
prova('volume da programma', volumeSerie(serie({ kgTarget: 60, ripMin: 5, ripMax: 5 })), 300);
prova('volume senza dati', volumeSerie(serie()), 0);

// --- avanzamento ---
prova('avanzamento', avanzamento([voce({ serie: [serie({ fatta: true }), serie()] }), voce({ serie: [serie({ fatta: true })] })]), { fatte: 2, totali: 3 });
prova('avanzamento vuoto', avanzamento([]), { fatte: 0, totali: 0 });

// --- doppia progressione ---
const range = s => serie({ ripMin: 6, ripMax: 10, ...s });
prova('in cima al range → su', suggerimento(voce({ serie: [range({ rip: 10, fatta: true }), range({ rip: 8, fatta: true })] })), 'su');
prova('sotto il minimo → giù', suggerimento(voce({ serie: [range({ rip: 5, fatta: true })] })), 'giu');
prova('dentro il range → niente', suggerimento(voce({ serie: [range({ rip: 8, fatta: true })] })), null);
prova('serie non fatta → niente', suggerimento(voce({ serie: [range({ rip: 10 })] })), null);
prova('ripetizioni fisse → niente', suggerimento(voce({ serie: [serie({ ripMin: 5, ripMax: 5, rip: 5, fatta: true })] })), null);

// --- settimane e giorni ---
const programma = [
  voce({ id: 'a', settimana: 2, giorno: 1, nomeGiorno: 'Upper', serie: [serie({ fatta: true })] }),
  voce({ id: 'b', settimana: 2, giorno: 2, nomeGiorno: 'Lower', serie: [serie(), serie({ fatta: true })] }),
  voce({ id: 'c', settimana: 1, giorno: 1, nomeGiorno: 'Upper', serie: [serie()] })
];
prova('settimane in ordine', settimane(programma), [1, 2]);
prova('giorni della settimana 2', giorniDellaSettimana(programma, 2).map(g => [g.giorno, g.nome, g.fatte, g.totali, g.completo]), [[1, 'Upper', 1, 1, true], [2, 'Lower', 1, 2, false]]);
prova('prossimo giorno = primo non completo', prossimoGiorno(programma, 2), 2);
prova('prossimo giorno, tutto fatto = ultimo', prossimoGiorno([programma[0]], 2), 1);
prova('prossimo giorno, settimana inesistente', prossimoGiorno(programma, 9), null);

// --- storico ---
const storia = storicoEsercizio([
  voce({ settimana: 1, serie: [serie({ kgTarget: 60, ripMin: 5, ripMax: 5 })] }),
  voce({ settimana: 2, serie: [serie({ kgTarget: 60, ripMin: 5, ripMax: 5, kg: 65, rip: 5, fatta: true }), serie({ kgTarget: 60, ripMin: 5, ripMax: 5 })] }),
  voce({ settimana: 2, esercizioId: 'squat', serie: [serie({ kgTarget: 200, ripMin: 5, ripMax: 5 })] })
], 'panca');
prova('storico: una riga per settimana', storia.map(r => r.settimana), [1, 2]);
prova('storico: miglior e1RM della settimana', storia.map(r => circa(r.e1rm)), [70, 75.8]);
prova('storico: serie registrate', storia.map(r => [r.registrate, r.serie]), [[0, 1], [1, 2]]);
prova('storico: volume', storia.map(r => r.volume), [300, 625]);

// --- testi ---
prova('descrizione ripetizioni fisse', descriviVoce(voce({ serie: [serie({ ripMin: 4, ripMax: 4, kgTarget: 95 }), serie()] })), '2×4 · 95 kg');
prova('descrizione a range con RIR', descriviVoce(voce({ serie: [range({ kgTarget: 12.5, rirTarget: 1 })] })), '1×6-10 · 12,5 kg · RIR 1');
prova('descrizione senza ripetizioni', descriviVoce(voce({ serie: [serie()] })), '1 serie');
prova('riepilogo per Riccardo', riepilogoGiorno([voce({ notaAtleta: 'bene', serie: [serie({ kg: 95, rip: 4, rir: 2, fatta: true }), serie({ kgTarget: 95 })] })], { panca: 'Panca piana' }, 37),
  'Settimana 37 · Giorno 1 Upper\n- Panca piana: 95×4 (RIR 2)\n  nota: bene');

// --- numeri scritti dall'utente ---
prova('numero con la virgola', numero('62,5'), 62.5);
prova('numero con il punto', numero(' 62.5 '), 62.5);
prova('campo vuoto', numero(''), null);
prova('testo non numerico', numero('abc'), null);
prova('formato italiano', fmt(62.5), '62,5');
prova('formato arrotondato', fmt(113.666), '113,7');
prova('formato intero', fmt(95), '95');

// --- timer ---
prova('orologio minuti', orologio(754000), '12:34');
prova('orologio ore', orologio(3925000), '1:05:25');
prova('orologio zero e negativi', [orologio(0), orologio(-5000)], ['0:00', '0:00']);
prova('durata breve minuti', durataBreve(754000), '13 min');
prova('durata breve ore', durataBreve(3925000), '1 h 05 min');
prova('riepilogo con durata', riepilogoGiorno([voce({ serie: [serie({ kg: 80, rip: 8, fatta: true })] })], { panca: 'Panca' }, 2, 3925000).split('\n')[1], 'Durata: 1 h 05 min');
prova('riepilogo senza durata', riepilogoGiorno([voce({ serie: [serie({ kg: 80, rip: 8, fatta: true })] })], { panca: 'Panca' }, 2).split('\n')[1], '- Panca: 80×8');

// --- risultato ---
const testo = `${passate} prove passate, ${fallite.length} fallite` + (fallite.length ? '\n' + fallite.join('\n') : '');
if (typeof document !== 'undefined') {
  document.getElementById('risultato').textContent = testo;
  document.body.style.background = fallite.length ? '#ffe0e0' : '#e0ffe6';
} else {
  console.log(testo);
  if (fallite.length) process.exitCode = 1;
}
