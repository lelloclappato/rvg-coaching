# RVG Coaching

App per i clienti del coaching di Riccardo (RVG Coaching): la scheda di allenamento sul telefono,
al posto del foglio Google. Installabile come app (PWA) e utilizzabile senza connessione.
È fatta con HTML, CSS e JavaScript semplici, senza framework né strumenti di compilazione,
come le app Abitudini e Le Mie Finanze.

**Versione 0.1 – prima tappa:** solo lato cliente, con i dati salvati sul telefono.
Non c'è ancora il database online, quindi Riccardo non vede i dati da solo: glieli si manda
con "Manda il riepilogo a Riccardo" (WhatsApp o altro).

## Cosa fa

- **Oggi**: l'allenamento da fare, i giorni della settimana, la nota del coach, la forza stimata
- **Allenamento**: per ogni serie kg, ripetizioni e RIR, con la spunta. Se chiudi il range di ripetizioni
  l'app suggerisce di aumentare il carico (doppia progressione). Nota per Riccardo su ogni esercizio.
  "Modifica programma" cambia serie, ripetizioni e carico quando Riccardo aggiorna la scheda
- **Progressi**: forza stimata (e1RM) di ogni esercizio settimana per settimana, con il record
- **Check-in**: peso, sonno, energia, stress, alimentazione e fastidi, una volta a settimana
- **Profilo**: nome, **4 stili** (Originale, Inchiostro, Dark fantasy, Avventura), nuova settimana,
  importazione della scheda, backup
- **Installabile** e funzionante **senza connessione**

## Come è fatto il codice

| File | A cosa serve |
|---|---|
| `index.html` | La pagina: è quasi vuota, la riempie il JavaScript |
| `css/base.css` | Forma e disposizione, uguali per tutti gli stili |
| `css/temi.css` | Colori, caratteri e decorazioni di ogni stile |
| `js/app.js` | Avvio, disegno delle schermate, tocchi e scritture |
| `js/dati.js` | **L'unico file che sa dove sono salvati i dati.** Oggi sul telefono, domani sul database |
| `js/calcoli.js` | Forza stimata, volume, avanzamento, suggerimenti (funzioni pure, provate in `tests/`) |
| `js/temi.js` | Elenco degli stili e parole che cambiano da uno stile all'altro |
| `js/viste/` | Una schermata per file |
| `js/esempio.js` | La scheda di esempio |
| `js/pwa.js`, `sw.js` | Installazione e uso senza connessione |
| `fonts/` | I caratteri, salvati qui (licenza OFL) così funzionano anche offline |

## Provare i calcoli

    node tests/calcoli.test.js

oppure aprire `tests/test.html` nel browser.

## Provare l'app sul computer

I file `.js` sono "moduli": non si aprono con un doppio clic su `index.html`, serve un piccolo server.
Dalla cartella `app/`:

    python -m http.server 8000

e poi aprire http://localhost:8000

## Il formato della scheda

Un file `.json` con `"formato": "rvg-scheda"`, l'elenco `esercizi` e l'elenco `programma`
(una voce per ogni esercizio di ogni giorno, con le sue serie). La descrizione completa è in cima a `js/dati.js`.

## Prossime tappe

1. Provarla in palestra per qualche settimana
2. Database online e account (Supabase): si riscrive solo `js/dati.js`
3. Pannello di Riccardo: creare la settimana, vedere clienti e check-in
