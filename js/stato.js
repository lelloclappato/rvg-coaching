// Lo "stato" dello schermo: cosa si sta guardando in questo momento.
// Non viene salvato: a ogni apertura l'app riparte dalla scheda "Oggi".
export const stato = {
  scheda: 'oggi',        // oggi | allenamento | progressi | checkin | profilo
  settimana: null,       // settimana aperta in Allenamento (null = l'ultima)
  giorno: null,          // giorno aperto in Allenamento (null = il prossimo da fare)
  voceAperta: null,      // id dell'esercizio aperto in Allenamento
  esercizioProgressi: null, // esercizio scelto in Progressi
  settimanaCheckin: null,
  bozzaCheckin: null,    // quello che stai scrivendo nel check-in prima di salvare
  checkinSalvato: false
};
