# RVG Coaching

App: https://lelloclappato.github.io/rvg-coaching/

## Telefono e computer: la sincronizzazione

In *Altro* (o *Profilo* / *Abitudini*, a seconda dell'app) c'è **Accedi con Google**: con lo stesso account sul telefono
e sul computer i dati restano uguali. Funziona così:

- i dati vanno in un file nella **cartella nascosta dell'app sul tuo Google Drive** (`appDataFolder`): non compare tra i file
  del Drive e l'app non può vedere nient'altro. Il permesso chiesto è solo `drive.appdata` (più `email`, per mostrare l'account);
- si sincronizza all'apertura, qualche secondo dopo ogni modifica, tornando sull'app e quando torna la connessione;
- l'accesso fatto dal browser dura **un'ora**: dopo, in Oggi compare **Sincronizza** e basta un tocco. Intanto i dati restano
  salvati sul dispositivo, come sempre;
- ogni elemento (libro, capitolo, parola, abitudine, giorno…) ha la sua data di modifica: unendo due copie vince la più recente,
  e una cosa eliminata non "risorge" dall'altro dispositivo. La prima volta che un dispositivo con dati suoi si collega,
  l'app chiede se unirli a quelli dell'account o usare solo quelli dell'account;
- resta solo sul dispositivo: il giorno dell'ultimo backup.

Il codice è in `js/sincro/` (uguale in tutte le mie app: `registro.js` capisce cosa è cambiato e unisce le copie,
`google.js` fa l'accesso, `drive.js` legge e scrive il file, `sincro.js` mette insieme tutto) e in `js/sincronizzazione.js`
(cosa si sincronizza in questa app). L'ID client OAuth del progetto Google Cloud "Le mie app" è in `js/sincronizzazione.js`:
è pubblico. Il *client secret* non serve e non va mai messo nel codice.
