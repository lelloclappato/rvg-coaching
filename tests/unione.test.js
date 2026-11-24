// Prove dell'unione delle schede tra coach e cliente (js/unione.js).
// Si lanciano dal computer con:  node tests/unione.test.js
import { unisciSchedaDalCoach, unisciDatiDelCliente, stessaScheda } from '../js/unione.js';

let passate = 0;
const fallite = [];
function prova(nome, ottenuto, atteso) {
  if (JSON.stringify(ottenuto) === JSON.stringify(atteso)) passate++;
  else fallite.push(`${nome}: atteso ${JSON.stringify(atteso)}, ottenuto ${JSON.stringify(ottenuto)}`);
}
const serie = (s = {}) => ({ ripMin: 6, ripMax: 10, rirTarget: 1, kgTarget: 60, kg: null, rip: null, rir: null, fatta: false, ...s });
const voce = (v = {}) => ({ id: 'v', settimana: 1, giorno: 1, nomeGiorno: 'Upper', ordine: 0, esercizioId: 'panca', notaCoach: '', notaAtleta: '', saltato: false, kgProssima: null, serie: [serie(), serie()], ...v });
const fatta = (kg, rip) => serie({ kg, rip, fatta: true });

// --- il coach prepara la scheda, il cliente la riceve per la prima volta e si allena ---
const coachS1 = { esercizi: [{ id: 'panca', nome: 'Panca piana', gruppo: 'Petto', video: '', regolazione: '' }],
  programma: [voce({ id: 'a' }), voce({ id: 'b', esercizioId: 'panca', ordine: 1 })] };
const cliente = { esercizi: [{ id: 'panca', nome: 'Panca', gruppo: '', video: '', regolazione: 'fermi al 4' }],
  programma: [voce({ id: 'a', serie: [fatta(62.5, 8), fatta(62.5, 7)], notaAtleta: 'bene' }), voce({ id: 'b', ordine: 1, saltato: true })],
  checkin: [{ settimana: 1, peso: 78.4 }] };

// --- il coach aggiunge la settimana 2 e cambia il carico della voce a, poi carica i dati del cliente ---
const coachS2 = { esercizi: coachS1.esercizi, programma: [
  voce({ id: 'a', serie: [serie({ kgTarget: 65 }), serie({ kgTarget: 65 }), serie({ kgTarget: 65 })], notaCoach: 'più lento' }),
  voce({ id: 'b', ordine: 1 }),
  voce({ id: 'c', settimana: 2 })
] };
const alCoach = unisciDatiDelCliente(coachS2, cliente);
const a = alCoach.programma.find(v => v.id === 'a');
prova('coach: tiene il suo programma', [a.serie.length, a.serie[0].kgTarget, a.notaCoach], [3, 65, 'più lento']);
prova('coach: vede le serie fatte dal cliente', a.serie.map(s => [s.kg, s.rip, s.fatta]), [[62.5, 8, true], [62.5, 7, true], [null, null, false]]);
prova('coach: vede note e salti del cliente', [a.notaAtleta, alCoach.programma.find(v => v.id === 'b').saltato], ['bene', true]);
prova('coach: la settimana 2 che ha preparato resta', alCoach.programma.some(v => v.id === 'c'), true);
prova('coach: check-in del cliente', alCoach.checkin, [{ settimana: 1, peso: 78.4 }]);
prova('coach: conta le serie nuove', alCoach.serieNuove, 2);
prova('coach: il nome dell\'esercizio è il suo, la regolazione del cliente', alCoach.esercizi[0].nome + ' / ' + alCoach.esercizi[0].regolazione, 'Panca piana / fermi al 4');
prova('coach: ricaricare lo stesso file non conta doppio', unisciDatiDelCliente(alCoach, cliente).serieNuove, 0);

// --- il cliente riceve la scheda aggiornata: le sue serie restano ---
const alCliente = unisciSchedaDalCoach(cliente, { esercizi: alCoach.esercizi, programma: alCoach.programma });
const a2 = alCliente.programma.find(v => v.id === 'a');
prova('cliente: nuovo programma', [a2.serie.length, a2.serie[2].kgTarget, a2.notaCoach], [3, 65, 'più lento']);
prova('cliente: le sue serie restano', a2.serie.slice(0, 2).map(s => s.kg), [62.5, 62.5]);
prova('cliente: arriva la settimana 2', alCliente.programma.some(v => v.id === 'c'), true);
prova('cliente: conteggi', [alCliente.nuove, alCliente.aggiornate, alCliente.tolte], [1, 2, 0]);

// --- il coach toglie un esercizio ---
const senzaB = unisciSchedaDalCoach(
  { esercizi: [], programma: [voce({ id: 'x' }), voce({ id: 'y', serie: [fatta(50, 8)] }), voce({ id: 'z' })] },
  { esercizi: [], programma: [voce({ id: 'z' })] });
prova('tolto e mai fatto: sparisce; già fatto: resta', senzaB.programma.map(v => v.id).sort(), ['y', 'z']);
prova('conteggio tolte', senzaB.tolte, 1);

// --- serie in più già fatte dal cliente non si perdono ---
const extra = unisciDatiDelCliente({ esercizi: [], programma: [voce({ id: 'q', serie: [serie()] })] },
  { esercizi: [], programma: [voce({ id: 'q', serie: [fatta(60, 8), fatta(60, 7)] })], checkin: [] });
prova('serie extra fatta: resta', extra.programma[0].serie.length, 2);

// --- voce che il coach non conosce ---
const sconosciuta = unisciDatiDelCliente({ esercizi: [], programma: [] }, { esercizi: [], programma: [voce({ id: 'nuova' })], checkin: [] });
prova('voce aggiunta dal cliente: il coach la vede', sconosciuta.programma.map(v => v.id), ['nuova']);

// --- stessa scheda? ---
prova('stessa scheda (codici in comune)', stessaScheda([voce({ id: 'a' })], [voce({ id: 'a' }), voce({ id: 'k' })]), true);
prova('scheda diversa', stessaScheda([voce({ id: 'a' })], [voce({ id: 'k' })]), false);

// --- i dati di partenza non vengono toccati ---
prova('niente modifiche ai dati di partenza', cliente.programma[0].serie.length, 2);

const testo = `${passate} prove passate, ${fallite.length} fallite` + (fallite.length ? '\n' + fallite.join('\n') : '');
console.log(testo);
if (fallite.length) process.exitCode = 1;
