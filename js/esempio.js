// Una scheda di esempio, per provare l'app senza importare niente.
// È nello stesso formato dei file "scheda" che si importano dal Profilo.
import { uid } from './utili.js';

// forma breve: [nome, gruppo, serie, ripMin, ripMax, rir, kg, nota]
const GIORNI = [
  { giorno: 1, nome: 'Upper', voci: [
    ['Panca piana', 'Petto', 4, 5, 5, 2, 60, 'Scapole addotte, piedi ben piantati.'],
    ['Lat machine', 'Schiena', 2, 6, 10, 1, 55, ''],
    ['Shoulder press', 'Spalle', 2, 6, 10, 1, 30, ''],
    ['Curl manubri', 'Bicipiti', 2, 8, 12, 1, 12, 'Per braccio.'],
    ['Pushdown ai cavi', 'Tricipiti', 2, 8, 12, 1, 25, '']
  ] },
  { giorno: 2, nome: 'Lower', voci: [
    ['Squat', 'Gambe', 4, 5, 5, 2, 80, 'Stessa profondità in tutte le ripetizioni.'],
    ['Stacco rumeno', 'Posteriore', 3, 6, 8, 2, 70, ''],
    ['Leg extension', 'Quadricipiti', 2, 8, 12, 1, 45, ''],
    ['Leg curl', 'Femorali', 2, 8, 12, 1, 40, ''],
    ['Crunch ai cavi', 'Addome', 2, 8, 12, 1, 35, '']
  ] }
];

export function schedaDiEsempio() {
  const esercizi = [];
  const programma = [];
  for (const g of GIORNI) {
    g.voci.forEach(([nome, gruppo, serie, ripMin, ripMax, rir, kg, nota], i) => {
      const esercizio = { id: uid(), nome, gruppo, video: '' };
      esercizi.push(esercizio);
      programma.push({
        id: uid(), settimana: 1, giorno: g.giorno, nomeGiorno: g.nome, ordine: i,
        esercizioId: esercizio.id, notaCoach: nota, notaAtleta: '',
        serie: Array.from({ length: serie }, () => ({
          ripMin, ripMax, rirTarget: rir, kgTarget: kg, kg: null, rip: null, rir: null, fatta: false
        }))
      });
    });
  }
  return { formato: 'rvg-scheda', versione: 1, esercizi, programma };
}
