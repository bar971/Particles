# HANDOFF — Animazione a particelle "Heart Animation"

Ultimo aggiornamento: 2026-08-13. Stato: **iterazione 6 consegnata**; verifiche tecniche superate; verifica visiva dell'iterazione 6 (Luna, ordine menu, Saetta, leggibilità Testo) ancora da fare da parte dell'utente. In più, l'utente ha segnalato un bug separato su mobile ancora da diagnosticare (vedi "Bug aperti" sotto).

## Cos'è

Animazione a particelle su canvas 2D: ~270 particelle (90 su mobile) con scie colorate inseguono punti-bersaglio che compongono forme geometriche o una scritta. Progetto **vanilla JS ES5, zero dipendenze**, 3 file, si apre in locale con doppio clic su `index.html` (nessun server, nessuna build).

| File | Ruolo |
|---|---|
| `index.html` | Scheletro: canvas full-screen + menu flottante `#shapeMenu` (lista `#shapeMenuList` vuota, riempita da JS; riga testo `#shapeMenuText` con input `#shapeTextInput` max 10 caratteri + bottone `#shapeTextConfirm`) |
| `style.css` | Canvas full-screen; stile del menu (pannello scuro semitrasparente fisso a sinistra, voci pill, `.active` evidenziata, input/bottone coordinati) |
| `script.js` | Tutto il resto: registro forme, campionamento, ciclo di vita, fisica particelle, colori, wiring del menu |

## Decisioni chiave (con motivazione)

- **Niente librerie, niente React** (valutato esplicitamente su richiesta dell'utente): l'UI è una lista + un input, stato banale; React imporrebbe runtime ~140 KB o toolchain di build contro il vincolo "tutto locale e a doppio clic". Si riapre il discorso solo se l'app cresce molto.
- **Cambiare forma = sostituire i punti-bersaglio**: le particelle (posizione/velocità/scie mai toccate) inseguono i nuovi bersagli e il morphing emerge gratis dalla fisica esistente.
- **Numero di punti costante per OGNI forma** (3·N: 270 desktop / 90 mobile, `shapePointCount` = 90/30): il numero di particelle e gli indici `q` non cambiano mai. Qualsiasi forma nuova DEVE rispettare questo vincolo.
- **Convenzioni**: stile codice ES5/`var` coerente con l'originale; commenti in italiano; coordinate canvas con y verso il basso (rotazione antioraria a schermo = `(x,y)→(y,−x)`).

## Architettura di `script.js` (in ordine di file)

1. **Polyfill** `requestAnimationFrame` + rilevamento mobile via user agent (`koef` 0.5 → canvas a mezza risoluzione, N ridotto).
2. **Vertici precalcolati**: `starVertices` (stella 5 punte), `davidTriA/B` (due triangoli), `snowflakeVertices` (Koch iterazione 2 via `kochIterate`, 48 vertici; rotazione gobba −60° verificata numericamente), `boltVertices` (saetta, 7 vertici disegnati a mano, dall'iterazione 6 più spigolosa, poligono semplice verificato).
3. **`getTextPoints(totalCount)`**: canvas offscreen 800×200 → `fillText` bold sans-serif 140px (auto-riduzione font se `measureText` > 90% larghezza) → `getImageData`, pixel con alpha>128 a stride 2. Selezione dei punti-bersaglio a **griglia** (dall'iterazione 6): il bounding box dei pixel candidati viene suddiviso in celle (dimensione iniziale che dà ~2·`totalCount` celle, raffinata una seconda volta se le celle non vuote sono ancora meno di `totalCount`), un punto per cella (centroide dei pixel candidati caduti in quella cella) → distribuzione spaziale uniforme sul testo (le vecchie lettere strette tipo "i" non restano più quasi vuote). Ordinamento per x poi y (coerenza locale: le particelle che camminano su indici adiacenti restano sulla stessa lettera) → selezione di `totalCount` punti a passo regolare sull'elenco dei punti-griglia. Fallback difensivo se zero pixel.
4. **Registro `shapes`** (17 voci, i nomi appaiono nel menu in ordine **alfabetico**, tranne Testo sempre ultimo): Astroide, Cardioide, Cuore, Deltoide, Farfalla, Fiocco di neve, Infinito, Lissajous, Lissajous 5:4, Luna, Quadrifoglio, Rosa (doppio strato: 5 petali + 5 al 70% ruotati 45°), Saetta (7 vertici, poligono semplice verificato, dall'iterazione 6 più spigolosa), Spirografo (ipotrocoide R=5 r=3 d=5 su [0,6π], `arcLen:true`), Stella, Stella di David, **Testo** (ultima, con `getPoints` al posto di `tMax`/`fn`). Farfalla: Temple Fay su [0,2π], ruotata −90° antioraria = ali a sinistra, `arcLen:true`. Luna (dall'iterazione 6): vera mezzaluna a due cerchi, C1 (R=1, centro origine) meno C2 (r=0.9, centro (−0.4,0)); intersezioni a ±116.0° su C1 e ±92.4° su C2, verificata numericamente non-ovale (spessore ridotto vicino a y=0) con le corna nei punti più a sinistra del profilo.
   - Forma parametrica: `{ name, tMax, fn(t)→[x,y], arcLen? }`. Il Cuore incorpora i fattori storici 210/13 nella `fn` perché la normalizzazione è isotropa.
5. **`resampleByArcLength(shape, count)`**: 2000 campioni densi → lunghezze d'arco cumulative → `count` punti equidistanti sul perimetro. Usato dalle forme con `arcLen:true` (Farfalla, Spirografo). Gira solo al cambio forma: costo trascurabile.
6. **`buildPoints(shape)`**: due rami. Con `getPoints` (Testo): usa direttamente i 3·N punti, senza anelli (gli anelli triplicherebbero il contorno del testo). Altrimenti: N campioni (uniformi in t o per arco), normalizzazione isotropa a estensione max **relativa alle dimensioni correnti del canvas** (`targetExtent = Math.min(width, height) * 0.35`, dall'iterazione 8; prima era una costante assoluta 230 px, troppo grande sul canvas dimezzato di mobile), poi 3 anelli concentrici con fattori 1 / 0.714 / 0.43. Il resize handler (punto 1) richiama `buildPoints` sulla forma corrente dopo aver aggiornato `width`/`height`, così i bersagli restano coerenti col nuovo canvas.
7. **Ciclo di vita forma**: `COMPOSE_MS = 2000` (nascita: scala da 0.05 a 1 con ease-out cubico; lo 0.05 evita bersagli degeneri in un punto → nessuna divisione per zero nella fisica), `FULL_HOLD_MS = 12000` (permanenza ferma a dimensione piena), poi auto-avanzamento con `nextAutoIndex` (salta Testo finché `currentText` è vuoto). `setShape(i)` ricostruisce `pointsOrigin` e resetta `lastShapeChange` (quindi anche il clic manuale fa ripartire la nascita). NON esiste più la pulsazione "battito" originale (rimossa nell'iterazione 4 su richiesta esplicita).
8. **Menu**: voci `<li>` generate dal registro (Testo escluso: ha la riga input dedicata); clic → `setShape(idx)` + `updateMenuHighlight()`; Invio o OK sull'input → `applyText()` (trim, vuoto ignorato). Dall'iterazione 7 il pannello `#shapeMenu` è a scomparsa: chiuso di default, apribile/chiudibile col bottone `#shapeMenuToggle` (☰/✕, fisso in alto a sinistra) tramite la classe CSS `.open` e la variabile di stato `menuOpen`; selezionare una forma o confermare un testo non chiude il menu.
9. **Loop rAF**: `pulse(sc,sc)` proietta `pointsOrigin`→`targetPoints` centrati; dissolvenza con fill nero alpha 0.1 (effetto scia globale); fisica per particella (attrazione a molla + attrito `force`, camminata sugli indici con salto casuale 5%); colore per frame `hsla(hue+hueOff, 100%, light, .3)` con `hue += 0.4` per frame (arcobaleno, ciclo ~15 s) e offset per particella (±25°, luminosità 55-70%).

## Storia delle iterazioni (tutte implementate da un agente Sonnet su delega; piani approvati in `C:\Users\chris\.claude\plans\enumerated-nibbling-mochi.md`, il file contiene solo l'ultimo)

1. Pulsante ciclo 6 forme (Cuore, Rosa, Farfalla, Infinito, Stella, Lissajous).
2. Farfalla ricampionata per lunghezza d'arco su [0,2π]; ciclo automatico 12 s; colori arcobaleno.
3. Hold 24 s (poi superato); Farfalla ruotata −90° antioraria; Rosa a doppio strato.
4. **Chiarimento utente**: via la pulsazione battito → nascita una tantum (2 s) + 12 s fermi a dimensione piena, ricomposizione a ogni cambio forma.
5. 10 nuove forme + forma Testo + menu flottante a sinistra (sostituisce il pulsante).
6. Luna sostituita con vera mezzaluna a due cerchi (era un ovale pieno); registro `shapes` riordinato alfabeticamente (Testo resta ultimo); Saetta ridisegnata più spigolosa (7 vertici invece di 10); `shapePointCount` aumentato 63/21→90/30 (270/90 particelle totali) e `getTextPoints` riscritta con campionamento a griglia per una distribuzione spaziale più uniforme dei punti-bersaglio del testo. Piano approvato per questa iterazione: `C:\Users\chris\.claude\plans\dreamy-wibbling-acorn.md` (nota: il commento sopra sui piani precedenti citava `enumerated-nibbling-mochi.md`, relativo all'iterazione 5; ogni iterazione ha il suo file di piano, non riusato).
7. Menu reso a scomparsa su richiesta esplicita dell'utente (il fix precedente via `text-size-adjust` non aveva risolto il problema del menu troppo largo su mobile): nuovo bottone `#shapeMenuToggle` (☰/✕) fisso in alto a sinistra, `#shapeMenu` chiuso di default (`transform: translate(-120%, -50%)`, fuori viewport) e portato in vista con la classe `.open` (`transform: translateY(-50%)`, transizione .25s). Stato gestito in `script.js` con la variabile `menuOpen` (chiuso all'avvio, nessuna differenza mobile/desktop); selezionare una forma o confermare un testo non chiude il menu (comportamento invariato, non richiesto).
8. Bug "fuori scala" su mobile (segnalato dall'utente): in `buildPoints` ogni forma veniva normalizzata a un'estensione **assoluta** di 230 px, indipendente dal canvas. Su mobile (`koef=0.5`) il canvas interno è largo circa metà della viewport CSS (es. ~195 px per un telefono di 390 px), quindi una forma di 230 px risultava più grande dell'intero canvas: si vedeva solo un frammento ravvicinato invece della figura completa. Fix: l'estensione target è ora relativa alle dimensioni correnti del canvas (`targetExtent = Math.min(width, height) * 0.35`, sostituisce entrambe le occorrenze di `230 / maxAbs`), e il resize handler ricostruisce `pointsOrigin = buildPoints(shapes[currentShapeIndex])` dopo aver aggiornato `width`/`height`, così anche un cambio di orientamento/dimensione a runtime ridimensiona correttamente la forma in corso. Verificato numericamente (Node, fuori browser) per tutte le 16 forme parametriche del registro (Testo escluso, non testabile senza DOM) su due dimensioni di canvas simulate — mobile piccolo (195×422) e desktop grande (1536×742) — nessun punto campionato supera `width/2`/`height/2` in nessuno dei due casi.

## Bug risolti di recente

- **Layout mobile rotto (segnalato 2026-08-13, risolto definitivamente in iterazione 7)**: su mobile il menu appariva enorme, sovrapposto a gran parte dello schermo. Primo tentativo di fix: `html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }` in `style.css`, ipotizzando che la causa fosse il "font boosting" automatico di Chrome Android. Il deploy con quel fix è andato live ma **non ha risolto il problema** (confermato da un secondo screenshot reale del telefono dell'utente). La regola `text-size-adjust` resta in `style.css` (comunque una buona pratica innocua), ma non è più descritta come il fix del menu. La causa reale: il menu è strutturalmente troppo largo per schermi stretti — 17 nomi di forme in italiano, `white-space: nowrap` sulle `<li>`, nessun vincolo di larghezza sul pannello. Soluzione (iterazione 7): menu reso a scomparsa, chiuso di default, con un bottone hamburger (☰) fisso in alto a sinistra che apre/chiude il pannello (scorrimento laterale via `transform`).

## Processo di lavoro concordato con l'utente

- Task non banali: **pianificare prima**, farsi approvare il piano, poi **delegare l'implementazione a un agente Sonnet** (richiesta ricorrente esplicita dell'utente).
- **Verifica visiva: la fa l'utente** in browser; a noi spettano `node --check script.js` (deve dare exit 0) e verifiche numeriche via Node della geometria (conteggio punti, NaN, estensioni, monotonia archi).
- Ambiguità con più interpretazioni: chiedere all'utente con opzioni e raccomandazione (protocollo del suo CLAUDE.md). Niente miglioramenti non richiesti: elencarli come suggerimenti.
- Rispondere sempre in italiano, commenti nel codice inclusi.

## Limiti noti / accettati

- Testo con 270 particelle (90 su mobile) e campionamento a griglia (dall'iterazione 6, sostituisce l'ordinamento pixel-grezzi): leggibilità migliorata rispetto alle iterazioni precedenti (189/63 particelle, distribuzione non uniforme), limite `maxlength` a 10 caratteri ancora presente; su mobile (90 particelle) la resa resta più grezza. Conferma definitiva di leggibilità in browser spetta all'utente, non ancora verificata visivamente dopo questa modifica.
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
