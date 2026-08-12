# Particles

Animazione a particelle su canvas 2D: ~189 particelle (63 su mobile) con scie colorate che inseguono punti-bersaglio componendo forme geometriche o una scritta personalizzata.

Progetto **vanilla JS (ES5), zero dipendenze**: basta un doppio clic su `index.html` per aprirlo in locale, nessun server e nessuna build richiesti.

## File

| File | Ruolo |
|---|---|
| `index.html` | Scheletro: canvas full-screen + menu flottante delle forme |
| `style.css` | Stile del canvas e del menu |
| `script.js` | Registro forme, fisica delle particelle, colori, gestione del menu |
| `HANDOFF.md` | Documentazione tecnica dettagliata per chi riprende in mano il progetto |

## Forme disponibili

17 forme selezionabili dal menu: Cuore, Rosa, Farfalla, Infinito, Stella, Lissajous 3:2, Spirografo, Astroide, Deltoide, Cardioide, Quadrifoglio, Lissajous 5:4, Luna, Stella di David, Fiocco di neve, Saetta, e una modalità **Testo** libero (fino a 10 caratteri).

## Come usarlo

1. Apri `index.html` nel browser (doppio clic o servi la cartella con un qualsiasi server statico).
2. Usa il menu a sinistra per selezionare una forma, oppure scrivi un testo nel campo dedicato e premi Invio/OK.
3. Le forme si alternano automaticamente ogni ~12 secondi se non viene fatta alcuna selezione manuale.

Per i dettagli architetturali e le decisioni di design, vedi [`HANDOFF.md`](./HANDOFF.md).

## Deploy

Pubblicato su Cloudflare Workers (static assets) all'indirizzo https://particles.bar971.workers.dev. Ogni push su `main` avvia automaticamente build e pubblicazione tramite Cloudflare Workers Builds (integrazione Git).

## Licenza

Rilasciato in pubblico dominio con [The Unlicense](./LICENSE).
