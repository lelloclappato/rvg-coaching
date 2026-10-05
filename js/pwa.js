// Tutto ciò che rende l'app "installabile" e utilizzabile senza connessione:
// registra il service worker (sw.js) e avvisa quando è pronta una versione nuova.
export function avviaPwa(avviso) {
  if (!('serviceWorker' in navigator)) return; // browser vecchio: l'app funziona lo stesso, solo online

  let inAttesa = null; // la versione nuova, scaricata ma non ancora attiva

  const proponi = worker => {
    inAttesa = worker;
    avviso('È pronta una nuova versione.', { azione: 'aggiorna-app', etichetta: 'Aggiorna' });
  };

  navigator.serviceWorker.register('./sw.js').then(registrazione => {
    if (registrazione.waiting && navigator.serviceWorker.controller) proponi(registrazione.waiting);
    registrazione.addEventListener('updatefound', () => {
      const nuovo = registrazione.installing;
      if (!nuovo) return;
      nuovo.addEventListener('statechange', () => {
        // "installed" + c'è già una versione attiva = è un aggiornamento, non la prima installazione
        if (nuovo.state === 'installed' && navigator.serviceWorker.controller) proponi(nuovo);
      });
    });
  }).catch(() => { /* niente service worker (es. file aperto dal disco): si usa l'app solo online */ });

  // tocco su "Aggiorna": si dice alla versione nuova di attivarsi…
  document.addEventListener('click', evento => {
    if (evento.target.closest('[data-azione="aggiorna-app"]') && inAttesa) inAttesa.postMessage({ type: 'SKIP_WAITING' });
  });
  // …e quando ha preso il controllo si ricarica la pagina, una volta sola
  let ricaricato = false;
  const avevaControllo = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (ricaricato || !avevaControllo) return;
    ricaricato = true;
    location.reload();
  });
}
