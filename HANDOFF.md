# HANDOFF — Animazione a particelle "Heart Animation"

Ultimo aggiornamento: 2026-08-12. Stato: **iterazione 5 consegnata**; verifiche tecniche superate; verifica visiva dell'iterazione 5 in corso da parte dell'utente.

## Cos'è

Animazione a particelle su canvas 2D: ~189 particelle (63 su mobile) con scie colorate inseguono punti-bersaglio che compongono forme geometriche o una scritta. Progetto **vanilla JS ES5, zero dipendenze**, 3 file, si apre in locale con doppio clic su `index.html` (nessun server, nessuna build).

| File | Ruolo |
|---|---|
| `index.html` | Scheletro: canvas full-screen + menu flottante `#shapeMenu` (lista `#shapeMenuList` vuota, riempita da JS; riga testo `#shapeMenuText` con input `#shapeTextInput` max 10 caratteri + bottone `#shapeTextConfirm`) |
| `style.css` | Canvas full-screen; stile del menu (pannello scuro semitrasparente fisso a sinistra, voci pill, `.active` evidenziata, input/bottone coordinati) |
| `script.js` | Tutto il resto: registro forme, campionamento, ciclo di vita, fisica particelle, colori, wiring del menu |

## Decisioni chiave (con motivazione)

- **Niente librerie, niente React** (valutato esplicitamente su richiesta dell'utente): l'UI è una lista + un input, stato banale; React imporrebbe runtime ~140 KB o toolchain di build contro il vincolo "tutto locale e a doppio clic". Si riapre il discorso solo se l'app cresce molto.
- **Cambiare forma = sostituire i punti-bersaglio**: le particelle (posizione/velocità/scie mai toccate) inseguono i nuovi bersagli e il morphing emerge gratis dalla fisica esistente.
- **Numero di punti costante per OGNI forma** (3·N: 189 desktop / 63 mobile): il numero di particelle e gli indici `q` non cambiano mai. Qualsiasi forma nuova DEVE rispettare questo vincolo.
- **Convenzioni**: stile codice ES5/`var` coerente con l'originale; commenti in italiano; coordinate canvas con y verso il basso (rotazione antioraria a schermo = `(x,y)→(y,−x)`).

## Architettura di `script.js` (in ordine di file)

1. **Polyfill** `requestAnimationFrame` + rilevamento mobile via user agent (`koef` 0.5 → canvas a mezza risoluzione, N ridotto).
2. **Vertici precalcolati**: `starVertices` (stella 5 punte), `davidTriA/B` (due triangoli), `snowflakeVertices` (Koch iterazione 2 via `kochIterate`, 48 vertici; rotazione gobba −60° verificata numericamente), `boltVertices` (saetta, 10 vertici disegnati a mano, poligono semplice verificato).
3. **`getTextPoints(totalCount)`**: canvas offscreen 800×200 → `fillText` bold sans-serif 140px (auto-riduzione font se `measureText` > 90% larghezza) → `getImageData`, pixel con alpha>128 a stride 2 → ordinamento per x poi y (coerenza locale: le particelle che camminano su indici adiacenti restano sulla stessa lettera) → selezione di `totalCount` punti equidistanti. Fallback difensivo se zero pixel.
4. **Registro `shapes`** (17 voci, i nomi appaiono nel menu in quest'ordine): Cuore, Rosa (doppio strato: 5 petali + 5 al 70% ruotati 45°), Farfalla (Temple Fay su [0,2π], ruotata −90° antioraria = ali a sinistra, `arcLen:true`), Infinito (lemniscata), Stella, Lissajous 3:2, Spirografo (ipotrocoide R=5 r=3 d=5 su [0,6π], `arcLen:true`), Astroide, Deltoide, Cardioide (lobo in alto), Quadrifoglio, Lissajous 5:4, Luna (due archi raccordati, gobba a destra), Stella di David, Fiocco di neve, Saetta, **Testo** (ultima, con `getPoints` al posto di `tMax`/`fn`).
   - Forma parametrica: `{ name, tMax, fn(t)→[x,y], arcLen? }`. Il Cuore incorpora i fattori storici 210/13 nella `fn` perché la normalizzazione è isotropa.
5. **`resampleByArcLength(shape, count)`**: 2000 campioni densi → lunghezze d'arco cumulative → `count` punti equidistanti sul perimetro. Usato dalle forme con `arcLen:true` (Farfalla, Spirografo). Gira solo al cambio forma: costo trascurabile.
6. **`buildPoints(shape)`**: due rami. Con `getPoints` (Testo): usa direttamente i 3·N punti, senza anelli (gli anelli triplicherebbero il contorno del testo). Altrimenti: N campioni (uniformi in t o per arco), normalizzazione isotropa a estensione max 230 px, poi 3 anelli concentrici con fattori 1 / 0.714 / 0.43.
7. **Ciclo di vita forma**: `COMPOSE_MS = 2000` (nascita: scala da 0.05 a 1 con ease-out cubico; lo 0.05 evita bersagli degeneri in un punto → nessuna divisione per zero nella fisica), `FULL_HOLD_MS = 12000` (permanenza ferma a dimensione piena), poi auto-avanzamento con `nextAutoIndex` (salta Testo finché `currentText` è vuoto). `setShape(i)` ricostruisce `pointsOrigin` e resetta `lastShapeChange` (quindi anche il clic manuale fa ripartire la nascita). NON esiste più la pulsazione "battito" originale (rimossa nell'iterazione 4 su richiesta esplicita).
8. **Menu**: voci `<li>` generate dal registro (Testo escluso: ha la riga input dedicata); clic → `setShape(idx)` + `updateMenuHighlight()`; Invio o OK sull'input → `applyText()` (trim, vuoto ignorato).
9. **Loop rAF**: `pulse(sc,sc)` proietta `pointsOrigin`→`targetPoints` centrati; dissolvenza con fill nero alpha 0.1 (effetto scia globale); fisica per particella (attrazione a molla + attrito `force`, camminata sugli indici con salto casuale 5%); colore per frame `hsla(hue+hueOff, 100%, light, .3)` con `hue += 0.4` per frame (arcobaleno, ciclo ~15 s) e offset per particella (±25°, luminosità 55-70%).

## Storia delle iterazioni (tutte implementate da un agente Sonnet su delega; piani approvati in `C:\Users\chris\.claude\plans\enumerated-nibbling-mochi.md`, il file contiene solo l'ultimo)

1. Pulsante ciclo 6 forme (Cuore, Rosa, Farfalla, Infinito, Stella, Lissajous).
2. Farfalla ricampionata per lunghezza d'arco su [0,2π]; ciclo automatico 12 s; colori arcobaleno.
3. Hold 24 s (poi superato); Farfalla ruotata −90° antioraria; Rosa a doppio strato.
4. **Chiarimento utente**: via la pulsazione battito → nascita una tantum (2 s) + 12 s fermi a dimensione piena, ricomposizione a ogni cambio forma.
5. 10 nuove forme + forma Testo + menu flottante a sinistra (sostituisce il pulsante).

## Processo di lavoro concordato con l'utente

- Task non banali: **pianificare prima**, farsi approvare il piano, poi **delegare l'implementazione a un agente Sonnet** (richiesta ricorrente esplicita dell'utente).
- **Verifica visiva: la fa l'utente** in browser; a noi spettano `node --check script.js` (deve dare exit 0) e verifiche numeriche via Node della geometria (conteggio punti, NaN, estensioni, monotonia archi).
- Ambiguità con più interpretazioni: chiedere all'utente con opzioni e raccomandazione (protocollo del suo CLAUDE.md). Niente miglioramenti non richiesti: elencarli come suggerimenti.
- Rispondere sempre in italiano, commenti nel codice inclusi.

## Limiti noti / accettati

- Testo con 189 particelle: leggibile fino a ~10 caratteri (limite imposto via `maxlength`); su mobile (63 particelle) la resa è grezza — accettato.
- Niente `devicePixelRatio`: su schermi HiDPI l'immagine è leggermente soft (mai richiesto di sistemarlo).
- Scheda in background: rAF si ferma, al ritorno può scattare subito un cambio forma (i timer usano `Date.now()`).
- CSS: `background-color: #00000033` sul canvas è di fatto invisibile (il JS riempie di nero pieno) — lascito dell'originale, mai toccato di proposito.
- Input font-size 13px: su iOS il focus può zoomare la pagina (sotto i 16px) — mai segnalato dall'utente.

## Suggerimenti fuori scope mai implementati (proposti all'utente, in attesa di sua richiesta)

- Tinta di colore dedicata per forma; supporto HiDPI; cambio forma da tastiera/clic sul canvas; Luna speculare (gobba a sinistra = un cambio di segno); campionamento più denso solo per forme complesse.

## Come verificare rapidamente

1. Doppio clic su `index.html` (o servire la cartella): il Cuore nasce in 2 s, resta 12 s, poi rotazione automatica di tutte le forme (Testo escluso finché non inserito).
2. Menu a sinistra: clic su una voce → nascita immediata di quella forma; scrivere max 10 caratteri nel campo e premere Invio/OK → le particelle compongono la scritta.
3. Sanity check da terminale: `node --check script.js` → exit 0.
