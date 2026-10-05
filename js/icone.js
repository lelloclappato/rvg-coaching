// Le icone dell'app, disegnate come SVG (immagini fatte di linee, nitide a ogni grandezza).
// "currentColor" = l'icona prende il colore del testo intorno, così segue lo stile scelto.
const svg = (dentro, misura = 22, spessore = 2) =>
  `<svg width="${misura}" height="${misura}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${spessore}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${dentro}</svg>`;

export const icone = {
  oggi: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  allenamento: svg('<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>'),
  progressi: svg('<path d="M4 19h16"/><path d="M5 15l5-5 4 3 6-7"/>'),
  checkin: svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 13l2 2 4-4"/>'),
  profilo: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
  spunta: svg('<path d="M5 12l5 5 9-10"/>', 20, 3),
  video: svg('<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>', 16),
  matita: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>', 16),
  condividi: svg('<path d="M4 12v7h16v-7"/><path d="M12 15V4"/><path d="M8 8l4-4 4 4"/>', 18),
  // nave e stella della rotta (stile Avventura)
  nave: '<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M14 3V19M14 4L23 16H14Z" fill="#FFF8EA" stroke="#FFF8EA" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 19H25L21 25H7Z" fill="#C24E1A" stroke="#2A1E12" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  stella: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3L14 10L21 12L14 14L12 21L10 14L3 12L10 10Z" fill="currentColor"/></svg>'
};
