window.requestAnimationFrame =
    window.__requestAnimationFrame ||
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    (function () {
        return function (callback, element) {
            var lastTime = element.__lastTime;
            if (lastTime === undefined) {
                lastTime = 0;
            }
            var currTime = Date.now();
            var timeToCall = Math.max(1, 33 - (currTime - lastTime));
            window.setTimeout(callback, timeToCall);
            element.__lastTime = currTime + timeToCall;
        };
    })();
window.isDevice = (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(((navigator.userAgent || navigator.vendor || window.opera)).toLowerCase()));
var loaded = false;
var init = function () {
    if (loaded) return;
    loaded = true;
    var mobile = window.isDevice;
    var koef = mobile ? 0.5 : 1;
    // Limite a 2 anche su schermi 3x, per non moltiplicare troppo il costo di rendering
    // già ridotto da koef su mobile.
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var canvas = document.getElementById('heart');
    var ctx = canvas.getContext('2d');
    // width/height restano lo spazio LOGICO usato ovunque nel resto del codice (fisica,
    // centraggio, normalizzazione delle forme); canvas.width/height sono invece in pixel
    // fisici (moltiplicati per dpr), e ctx.scale compensa la differenza per i comandi di
    // disegno. ctx.scale va chiamato DOPO aver impostato canvas.width/height, perché
    // impostarli resetta qualunque transform precedente.
    var width = koef * innerWidth;
    var height = koef * innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    var rand = Math.random;
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, width, height);

    var heartPosition = function (rad) {
        //return [Math.sin(rad), Math.cos(rad)];
        return [Math.pow(Math.sin(rad), 3), -(15 * Math.cos(rad) - 5 * Math.cos(2 * rad) - 2 * Math.cos(3 * rad) - Math.cos(4 * rad))];
    };
    var scaleAndTranslate = function (pos, sx, sy, dx, dy) {
        return [dx + pos[0] * sx, dy + pos[1] * sy];
    };

    // Stato "camera": pan (tasto sinistro), rotazione attorno all'asse Y (tasto destro) e
    // zoom (rotellina desktop / pinch touch). Non vengono mai resettati da setShape o dal
    // cambio forma automatico: persistono come stato indipendente dalla forma mostrata.
    var panX = 0, panY = 0;
    var isPanning = false, lastPanX, lastPanY;
    var rotationY = 0;
    var rotationX = 0;
    var isRotating = false, lastRotX, lastRotY;
    var zoom = 1;
    var resetView = function () { panX = 0; panY = 0; rotationY = 0; rotationX = 0; zoom = 1; };

    canvas.addEventListener('contextmenu', function (ev) {
        ev.preventDefault(); // altrimenti il tasto destro apre il menu del browser invece di ruotare
    });
    canvas.addEventListener('mousedown', function (ev) {
        if (ev.button === 0) {
            isPanning = true;
            lastPanX = ev.clientX;
            lastPanY = ev.clientY;
        } else if (ev.button === 2) {
            isRotating = true;
            lastRotX = ev.clientX;
            lastRotY = ev.clientY;
        }
    });
    window.addEventListener('mousemove', function (ev) {
        if (isPanning) {
            panX += ev.clientX - lastPanX;
            panY += ev.clientY - lastPanY;
            lastPanX = ev.clientX;
            lastPanY = ev.clientY;
        }
        if (isRotating) {
            rotationY += (ev.clientX - lastRotX) * 0.005;
            lastRotX = ev.clientX;
            rotationX += (ev.clientY - lastRotY) * 0.005;
            if (rotationX > 1.4) rotationX = 1.4;
            if (rotationX < -1.4) rotationX = -1.4;
            lastRotY = ev.clientY;
        }
    });
    window.addEventListener('mouseup', function () {
        isPanning = false;
        isRotating = false;
    });
    canvas.addEventListener('dblclick', resetView);

    // Zoom con rotellina (desktop): preventDefault necessario per impedire lo scroll
    // della pagina mentre si zooma sul canvas, quindi serve { passive: false }.
    canvas.addEventListener('wheel', function (ev) {
        ev.preventDefault();
        zoom *= (ev.deltaY < 0 ? 1.1 : 1 / 1.1);
        if (zoom < 0.3) zoom = 0.3;
        if (zoom > 3) zoom = 3;
    }, { passive: false });

    // Gesti touch (mobile): un dito = pan (stessa logica del pan col tasto sinistro),
    // due dita = pinch-zoom + rotazione simultanei (nessuna distinzione tra i due gesti,
    // scelta voluta: applica sempre entrambi gli aggiornamenti).
    var touchDist = function (t0, t1) {
        var dx = t1.clientX - t0.clientX, dy = t1.clientY - t0.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };
    var startDist, startZoom, lastMidX, lastMidY;
    var lastTapTime = 0, tapStartX, tapStartY;
    canvas.addEventListener('touchstart', function (ev) {
        ev.preventDefault();
        if (ev.touches.length === 1) {
            lastPanX = ev.touches[0].clientX;
            lastPanY = ev.touches[0].clientY;
            tapStartX = ev.touches[0].clientX;
            tapStartY = ev.touches[0].clientY;
        } else if (ev.touches.length === 2) {
            startDist = touchDist(ev.touches[0], ev.touches[1]);
            startZoom = zoom;
            lastMidX = (ev.touches[0].clientX + ev.touches[1].clientX) / 2;
            lastMidY = (ev.touches[0].clientY + ev.touches[1].clientY) / 2;
        }
    }, { passive: false });
    canvas.addEventListener('touchmove', function (ev) {
        ev.preventDefault();
        if (ev.touches.length === 1) {
            panX += ev.touches[0].clientX - lastPanX;
            panY += ev.touches[0].clientY - lastPanY;
            lastPanX = ev.touches[0].clientX;
            lastPanY = ev.touches[0].clientY;
        } else if (ev.touches.length === 2) {
            var curDist = touchDist(ev.touches[0], ev.touches[1]);
            var curMidX = (ev.touches[0].clientX + ev.touches[1].clientX) / 2;
            zoom = startZoom * (curDist / startDist);
            if (zoom < 0.3) zoom = 0.3;
            if (zoom > 3) zoom = 3;
            rotationY += (curMidX - lastMidX) * 0.005;
            lastMidX = curMidX;
            var curMidY = (ev.touches[0].clientY + ev.touches[1].clientY) / 2;
            rotationX += (curMidY - lastMidY) * 0.005;
            if (rotationX > 1.4) rotationX = 1.4;
            if (rotationX < -1.4) rotationX = -1.4;
            lastMidY = curMidY;
        }
    }, { passive: false });
    canvas.addEventListener('touchend', function (ev) {
        if (ev.touches.length === 0) {
            var relX = ev.changedTouches[0].clientX, relY = ev.changedTouches[0].clientY;
            var movedDist = Math.sqrt(Math.pow(relX - tapStartX, 2) + Math.pow(relY - tapStartY, 2));
            if (movedDist < 10) {
                if (Date.now() - lastTapTime < 350) {
                    resetView();
                    lastTapTime = 0;
                } else {
                    lastTapTime = Date.now();
                }
            }
        } else if (ev.touches.length === 1) {
            // da due tocchi a uno: reinizializza il pan dal tocco rimasto per evitare un salto visivo.
            lastPanX = ev.touches[0].clientX;
            lastPanY = ev.touches[0].clientY;
        }
    }, { passive: false });

    window.addEventListener('resize', function () {
        width = koef * innerWidth;
        height = koef * innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr); // il resize del canvas azzera il transform, va sempre riapplicato
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, width, height);
        // Ricostruisce i bersagli della forma corrente sulle nuove dimensioni del canvas
        // (buildPoints/shapes/currentShapeIndex/pointsOrigin sono dichiarati più in basso
        // nel file, ma essendo questa una closure eseguita solo al resize, che avviene
        // sempre dopo il completamento di init, sono già definiti quando la callback gira).
        pointsOrigin = buildPoints(shapes[currentShapeIndex]);
    });

    var i;

    // Vertici della stella a 5 punte (10 vertici alternati: raggio esterno 1, interno 0.4),
    // calcolati una sola volta. Angolo di partenza -PI/2 = punta in alto.
    var starVertices = [];
    var starN = 10;
    for (i = 0; i < starN; i++) {
        var ang = -Math.PI / 2 + i * (Math.PI / 5);
        var r = (i % 2 === 0) ? 1 : 0.4;
        starVertices.push([r * Math.cos(ang), r * Math.sin(ang)]);
    }

    // Vertici della Stella di David: due triangoli equilateri (raggio 1) ruotati di 60°
    // l'uno rispetto all'altro, usati come due perimetri distinti (metà dominio ciascuno).
    var davidTriA = [];
    var davidTriB = [];
    for (i = 0; i < 3; i++) {
        var angA = -Math.PI / 2 + i * (Math.PI * 2 / 3);
        var angB = Math.PI / 2 + i * (Math.PI * 2 / 3);
        davidTriA.push([Math.cos(angA), Math.sin(angA)]);
        davidTriB.push([Math.cos(angB), Math.sin(angB)]);
    }

    // Fiocco di neve: curva di Koch, iterazione 2, su triangolo equilatero (raggio 1, punta
    // in alto). Ogni lato viene suddiviso ricorsivamente in 4 segmenti con una gobba a 60°
    // verso l'esterno (angolo di rotazione -60°, verificato numericamente sull'orientamento
    // dei vertici generati sopra: fa sporgere la gobba lontano dal centro, non verso di esso).
    var kochIterate = function (verts) {
        var out = [];
        var n = verts.length;
        var idx2, p0, p1, dx, dy, pA, pB, ang2, rx, ry, pC;
        for (idx2 = 0; idx2 < n; idx2++) {
            p0 = verts[idx2];
            p1 = verts[(idx2 + 1) % n];
            dx = (p1[0] - p0[0]) / 3;
            dy = (p1[1] - p0[1]) / 3;
            pA = [p0[0] + dx, p0[1] + dy];
            pB = [p0[0] + 2 * dx, p0[1] + 2 * dy];
            ang2 = -Math.PI / 3;
            rx = dx * Math.cos(ang2) - dy * Math.sin(ang2);
            ry = dx * Math.sin(ang2) + dy * Math.cos(ang2);
            pC = [pA[0] + rx, pA[1] + ry];
            out.push(p0, pA, pC, pB);
        }
        return out;
    };
    var snowflakeVertices = [
        [Math.cos(-Math.PI / 2), Math.sin(-Math.PI / 2)],
        [Math.cos(-Math.PI / 2 + Math.PI * 2 / 3), Math.sin(-Math.PI / 2 + Math.PI * 2 / 3)],
        [Math.cos(-Math.PI / 2 + Math.PI * 4 / 3), Math.sin(-Math.PI / 2 + Math.PI * 4 / 3)]
    ];
    snowflakeVertices = kochIterate(snowflakeVertices); // iterazione 1 (12 vertici)
    snowflakeVertices = kochIterate(snowflakeVertices); // iterazione 2 (48 vertici)
    var snowflakeN = snowflakeVertices.length;

    // Vertici della Saetta (fulmine stilizzato): spezzata chiusa disegnata a mano, punta in basso.
    var boltVertices = [
        [-0.5, -1.0], [-0.5, 0.1], [-0.2, 0.1], [-0.2, 1.0], [0.5, -0.2], [0.1, -0.2], [0.5, -1.0]
    ];
    var boltN = boltVertices.length;

    // Registro delle forme disponibili: ognuna ha un dominio (tMax) e una funzione
    // parametrica fn(t) -> [x, y] in coordinate "grezze" (prima della normalizzazione).
    var shapes = [
        {
            name: "Astroide",
            tMax: Math.PI * 2,
            fn: function (t) {
                var c = Math.cos(t), s = Math.sin(t);
                return [c * c * c, s * s * s];
            }
        },
        {
            name: "Cardioide",
            tMax: Math.PI * 2,
            fn: function (t) {
                var r = 1 - Math.sin(t);
                return [r * Math.cos(t), r * Math.sin(t)];
            }
        },
        {
            name: "Cuore",
            tMax: Math.PI * 2,
            fn: function (t) {
                var p = heartPosition(t);
                // I fattori 210/13 replicano le proporzioni x/y della formula originale:
                // servono perché la normalizzazione in buildPoints è isotropa (unico fattore
                // di scala per x e y), mentre le coordinate grezze di heartPosition hanno
                // ampiezze molto diverse tra x e y.
                return [p[0] * 210, p[1] * 13];
            }
        },
        {
            name: "Deltoide",
            tMax: Math.PI * 2,
            fn: function (t) {
                return [2 * Math.cos(t) + Math.cos(2 * t), 2 * Math.sin(t) - Math.sin(2 * t)];
            }
        },
        {
            name: "Farfalla",
            tMax: Math.PI * 2, // curva di Temple Fay: la silhouette è già completa su 2π
            arcLen: true, // ricampiona per lunghezza d'arco (evita l'aliasing con soli N punti)
            fn: function (t) {
                var r = Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) + Math.pow(Math.sin((2 * t - Math.PI) / 24), 5);
                // ruotata di -90° (antioraria a schermo, y verso il basso): (x,y) -> (y,-x)
                return [-r * Math.cos(t), -r * Math.sin(t)]; // ali verso sinistra
            }
        },
        {
            name: "Fiocco di neve",
            tMax: 1,
            fn: function (t) {
                var seg = t * snowflakeN;
                var idx = ~~seg % snowflakeN;
                var frac = seg - ~~seg;
                var a = snowflakeVertices[idx];
                var b = snowflakeVertices[(idx + 1) % snowflakeN];
                return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
            }
        },
        {
            name: "Infinito",
            tMax: Math.PI * 2, // lemniscata di Bernoulli
            fn: function (t) {
                var s2 = Math.sin(t) * Math.sin(t);
                return [Math.cos(t) / (1 + s2), Math.sin(t) * Math.cos(t) / (1 + s2)];
            }
        },
        {
            name: "Lissajous",
            tMax: Math.PI * 2,
            fn: function (t) {
                return [Math.sin(3 * t + Math.PI / 2), Math.sin(2 * t)];
            }
        },
        {
            name: "Lissajous 5:4",
            tMax: Math.PI * 2,
            fn: function (t) {
                return [Math.sin(5 * t + Math.PI / 2), Math.sin(4 * t)];
            }
        },
        {
            name: "Luna",
            // Vera mezzaluna a due cerchi: C1 (raggio R=1, centro origine) meno C2 (raggio
            // r=0.9, centro (-0.4,0)). Intersezioni con d=0.4: a=(d²-r²+R²)/(2d)=0.4375,
            // h=√(R²-a²)≈0.899 → punti (-0.4375, ±0.899), corrispondenti a ±116.0° su C1
            // e ±92.4° su C2 (rispetto ai rispettivi centri).
            tMax: 2, // metà dominio per arco
            fn: function (t) {
                if (t < 1) {
                    // arco esterno: cerchio C1, da -116.0° a +116.0° (passando per 0°, la gobba a destra)
                    var ang = (-116.0 + 232.0 * t) * Math.PI / 180;
                    return [Math.cos(ang), Math.sin(ang)];
                } else {
                    // arco interno (concavo): cerchio C2, da +92.4° a -92.4° (passando per 0°)
                    var u = t - 1;
                    var ang2 = (92.4 - 184.8 * u) * Math.PI / 180;
                    return [-0.4 + 0.9 * Math.cos(ang2), 0.9 * Math.sin(ang2)];
                }
            }
        },
        {
            name: "Quadrifoglio",
            tMax: Math.PI * 2, // rodonea k=2 (pari): serve tutto [0,2π] per ottenere i 4 petali
            fn: function (t) {
                return [Math.cos(2 * t) * Math.cos(t), Math.cos(2 * t) * Math.sin(t)];
            }
        },
        {
            name: "Rosa",
            tMax: Math.PI * 2, // due strati da PI ciascuno: petali grandi + petali piccoli ruotati
            fn: function (t) {
                var c = Math.SQRT1_2; // cos(PI/4) = sin(PI/4)
                if (t < Math.PI) {
                    // strato 1: rodonea grande (k=5 dispari, chiusa già su [0, PI])
                    return [Math.cos(5 * t) * Math.cos(t), Math.cos(5 * t) * Math.sin(t)];
                } else {
                    // strato 2: rodonea piccola (fattore 0.7), ruotata di 45°
                    var u = t - Math.PI;
                    var p0 = Math.cos(5 * u) * Math.cos(u);
                    var p1 = Math.cos(5 * u) * Math.sin(u);
                    return [0.7 * (p0 * c - p1 * c), 0.7 * (p0 * c + p1 * c)];
                }
            }
        },
        {
            name: "Saetta",
            tMax: 1,
            fn: function (t) {
                var seg = t * boltN;
                var idx = ~~seg % boltN;
                var frac = seg - ~~seg;
                var a = boltVertices[idx];
                var b = boltVertices[(idx + 1) % boltN];
                return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
            }
        },
        {
            name: "Spirografo",
            tMax: Math.PI * 6, // ipotrocoide R=5, r=3: periodo di chiusura 2π·r/mcd(R,r) = 6π
            arcLen: true,
            fn: function (t) {
                var Rr = 2; // R - r = 5 - 3
                var k = Rr / 3; // (R-r)/r
                return [Rr * Math.cos(t) + 5 * Math.cos(k * t), Rr * Math.sin(t) - 5 * Math.sin(k * t)];
            }
        },
        {
            name: "Stella",
            tMax: 1, // interpolazione lineare lungo il perimetro, t in [0,1]
            fn: function (t) {
                var seg = t * starN;
                var idx = ~~seg % starN;
                var u = seg - ~~seg;
                var a = starVertices[idx];
                var b = starVertices[(idx + 1) % starN];
                return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
            }
        },
        {
            name: "Stella di David",
            tMax: 2, // metà dominio per triangolo
            fn: function (t) {
                var tri, u;
                if (t < 1) { tri = davidTriA; u = t; } else { tri = davidTriB; u = t - 1; }
                var seg = u * 3;
                var idx = ~~seg % 3;
                var frac = seg - ~~seg;
                var a = tri[idx];
                var b = tri[(idx + 1) % 3];
                return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
            }
        }
    ];

    // Numero di campioni per forma: costante per tutte le forme così il numero totale
    // di punti (e quindi il numero di particelle) non cambia mai al cambio forma.
    var shapePointCount = mobile ? 30 : 90;
    var ringFactors = [1, 0.714, 0.43]; // proporzioni degli anelli attuali (210:150:90)

    // Ricampiona una forma per lunghezza d'arco: campiona la curva in denseN punti
    // densi uniformi in t, calcola le lunghezze d'arco cumulative lungo il perimetro,
    // poi estrae "count" punti equidistanti in lunghezza (non in t). Usato per la
    // Farfalla, la cui velocità lungo la curva non è costante in t (senza questo
    // ricampionamento i punti si addensano/diradano creando rumore visivo).
    var resampleByArcLength = function (shape, count) {
        var denseN = 2000;
        var dense = [];
        var j, t;
        for (j = 0; j <= denseN; j++) {
            t = shape.tMax * j / denseN;
            dense.push(shape.fn(t));
        }
        var cum = [0];
        var k, dx, dy;
        for (k = 1; k <= denseN; k++) {
            dx = dense[k][0] - dense[k - 1][0];
            dy = dense[k][1] - dense[k - 1][1];
            cum.push(cum[k - 1] + Math.sqrt(dx * dx + dy * dy));
        }
        var totalLen = cum[denseN];
        var out = [];
        var target, idx, segStart, segEnd, frac, a, b;
        for (j = 0; j < count; j++) {
            target = totalLen * j / count;
            idx = 0;
            while (idx < denseN && cum[idx + 1] < target) idx++;
            segStart = cum[idx];
            segEnd = cum[idx + 1];
            frac = (segEnd - segStart) > 0 ? (target - segStart) / (segEnd - segStart) : 0;
            a = dense[idx];
            b = dense[idx + 1];
            out.push([a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac]);
        }
        return out;
    };

    // Campiona la forma in shapePointCount punti sul suo dominio (uniformi in t, oppure
    // per lunghezza d'arco se la forma ha il flag arcLen), normalizza l'estensione
    // massima in proporzione alle dimensioni correnti del canvas (non più un valore
    // assoluto fisso: su mobile, con canvas a mezza risoluzione, una costante assoluta
    // poteva superare la larghezza reale dello schermo) e genera i 3 anelli concentrici.
    var buildPoints = function (shape) {
        var raw, j, t, maxAbs, scale, pts;
        var targetExtent = Math.min(width, height) * 0.35;

        raw = [];
        if (shape.arcLen) {
            raw = resampleByArcLength(shape, shapePointCount);
        } else {
            for (j = 0; j < shapePointCount; j++) {
                t = shape.tMax * j / shapePointCount;
                raw.push(shape.fn(t));
            }
        }
        maxAbs = 0;
        for (j = 0; j < raw.length; j++) {
            maxAbs = Math.max(maxAbs, Math.abs(raw[j][0]), Math.abs(raw[j][1]));
        }
        scale = maxAbs > 0 ? targetExtent / maxAbs : 1;
        pts = [];
        var f;
        // Profondità (z) per anello: l'anello esterno (f=0, fattore 1) resta sul piano z=0,
        // gli anelli interni si allontanano proporzionalmente a quanto sono rimpiccioliti
        // rispetto all'esterno, così la rotazione produce una parallasse reale tra gli anelli.
        var ringDepths = [0, (1 - ringFactors[1]) * targetExtent * 0.5, (1 - ringFactors[2]) * targetExtent * 0.5];
        var p2;
        for (f = 0; f < ringFactors.length; f++) {
            for (j = 0; j < raw.length; j++) {
                p2 = scaleAndTranslate(raw[j], scale * ringFactors[f], scale * ringFactors[f], 0, 0);
                pts.push([p2[0], p2[1], ringDepths[f]]);
            }
        }
        return pts;
    };

    var currentShapeIndex = 0;
    var pointsOrigin = buildPoints(shapes[currentShapeIndex]);
    var heartPointsCount = pointsOrigin.length;

    // Ciclo di vita di ogni forma: composizione una tantum (crescita da piccola a piena
    // in COMPOSE_MS), poi permanenza ferma a dimensione piena per FULL_HOLD_MS.
    var COMPOSE_MS = 2000;
    var FULL_HOLD_MS = 12000;
    var lastShapeChange = Date.now();

    // Cambia forma: sostituisce solo il contenuto di pointsOrigin (i bersagli).
    // Le particelle (posizione, velocità, scia) restano invariate: inseguendo i nuovi
    // bersagli creano da sole l'effetto di morphing.
    var setShape = function (index) {
        currentShapeIndex = ((index % shapes.length) + shapes.length) % shapes.length;
        pointsOrigin = buildPoints(shapes[currentShapeIndex]);
        lastShapeChange = Date.now(); // riparte anche sul cambio manuale (clic)
    };

    var targetPoints = [];
    var pulse = function (kx, ky) {
        // Rotazione su 2 assi: Y (componente orizzontale del drag col tasto destro, ruota
        // x/z nel piano orizzontale) e X (componente verticale, inclina y verso z). Non è
        // un vero arcball, per scelta. Nessun ordinamento per profondità nel rendering:
        // l'ordine di disegno resta quello attuale, invariato. Lo zoom scala la forma
        // attorno al proprio centro: va applicato PRIMA di sommare il centro del canvas
        // e il pan.
        var cosY = Math.cos(rotationY), sinY = Math.sin(rotationY);
        var cosX = Math.cos(rotationX), sinX = Math.sin(rotationX);
        var p, rx, ry;
        for (i = 0; i < pointsOrigin.length; i++) {
            p = pointsOrigin[i];
            rx = p[0] * cosY - p[2] * sinY;
            ry = p[1] * cosX - (p[0] * sinY + p[2] * cosY) * sinX;
            targetPoints[i] = [];
            targetPoints[i][0] = kx * rx * zoom + width / 2 + panX;
            targetPoints[i][1] = ky * ry * zoom + height / 2 + panY;
        }
    };

    var e = [];
    for (i = 0; i < heartPointsCount; i++) {
        var x = rand() * width;
        var y = rand() * height;
        e[i] = {
            vx: 0,
            vy: 0,
            R: 2,
            speed: rand() + 5,
            q: ~~(rand() * heartPointsCount),
            D: 2 * (i % 2) - 1,
            force: 0.2 * rand() + 0.7,
            hueOff: 50 * rand() - 25, // offset di tinta rispetto a "hue" globale (±25°)
            light: 55 + 15 * rand(), // luminosità 55-70%, sempre vivace
            x: x,
            y: y
        };
    }

    // Menu flottante a sinistra: le voci sono generate dal registro "shapes" (nessun nome
    // hardcoded in HTML).
    var shapeMenuList = document.getElementById('shapeMenuList');
    var shapeMenu = document.getElementById('shapeMenu');
    var shapeMenuToggle = document.getElementById('shapeMenuToggle');
    var shapeAutoToggle = document.getElementById('shapeAutoToggle');

    // Ciclo automatico tra le forme: attivo di default (comportamento invariato finché
    // l'utente non tocca il bottone play/pausa). Una scelta manuale (clic su una voce
    // della lista) lo mette in pausa.
    var autoPlay = true;
    var updateAutoToggleState = function () {
        if (shapeAutoToggle) {
            shapeAutoToggle.textContent = autoPlay ? '⏸' : '▶';
            shapeAutoToggle.setAttribute('aria-label', autoPlay ? 'Metti in pausa il ciclo automatico' : 'Riprendi il ciclo automatico');
        }
    };
    updateAutoToggleState();
    if (shapeAutoToggle) {
        shapeAutoToggle.addEventListener('click', function () {
            autoPlay = !autoPlay;
            if (autoPlay) {
                lastShapeChange = Date.now(); // riparte pulita la permanenza sulla forma corrente
            }
            updateAutoToggleState();
        });
    }

    // Menu a scomparsa: chiuso di default (nessuna logica diversa per mobile/desktop).
    var menuOpen = false;
    var updateMenuOpenState = function () {
        if (shapeMenu) {
            if (menuOpen) shapeMenu.className = 'open';
            else shapeMenu.className = '';
        }
        if (shapeMenuToggle) {
            shapeMenuToggle.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
            shapeMenuToggle.textContent = menuOpen ? '✕' : '☰';
        }
    };
    if (shapeMenuToggle) {
        shapeMenuToggle.addEventListener('click', function () {
            menuOpen = !menuOpen;
            updateMenuOpenState();
        });
    }
    updateMenuOpenState();

    // Aggiorna l'evidenziazione della voce attiva nel menu (usata da clic e auto-avanzamento).
    var updateMenuHighlight = function () {
        if (shapeMenuList) {
            var items = shapeMenuList.children;
            for (var idx = 0; idx < items.length; idx++) {
                items[idx].className = (idx === currentShapeIndex) ? 'active' : '';
            }
        }
    };

    // Prossimo indice per l'auto-avanzamento.
    var nextAutoIndex = function (fromIndex) {
        return (fromIndex + 1) % shapes.length;
    };

    if (shapeMenuList) {
        for (i = 0; i < shapes.length; i++) {
            (function (idx) {
                var li = document.createElement('li');
                li.textContent = shapes[idx].name;
                li.addEventListener('click', function () {
                    setShape(idx);
                    updateMenuHighlight();
                    autoPlay = false;
                    updateAutoToggleState();
                });
                shapeMenuList.appendChild(li);
            })(i);
        }
    }

    updateMenuHighlight();

    // Gizmo assi XYZ: mostra l'orientamento corrente della rotazione sui 2 assi (Y e X),
    // origine fissa in basso a sinistra (ricalcolata a ogni chiamata così segue il resize).
    // Proiezione ortografica coerente con quella usata in pulse, applicata ai 3 versori locali.
    var drawAxisGizmo = function () {
        var gizmoX = 40, gizmoY = height - 40;
        var L = 22;
        var cosY = Math.cos(rotationY), sinY = Math.sin(rotationY);
        var cosX = Math.cos(rotationX), sinX = Math.sin(rotationX);
        var axes = [
            { dx: L * cosY, dy: L * (-sinY * sinX), color: "rgba(255,255,255,.55)", label: "X" },
            { dx: 0, dy: -L * cosX, color: "rgba(255,255,255,.55)", label: "Y" },
            { dx: -L * sinY, dy: -L * cosY * sinX, color: "rgba(255,255,255,.55)", label: "Z" }
        ];
        var a, dx, dy, len, ang, ax, ay, arrowLen, leftAng, rightAng, lx, ly, rx2, ry2;
        ctx.font = "9px sans-serif";
        ctx.lineWidth = 1;
        for (var ai = 0; ai < axes.length; ai++) {
            a = axes[ai];
            dx = a.dx;
            dy = a.dy;
            len = Math.sqrt(dx * dx + dy * dy);
            ctx.strokeStyle = a.color;
            ctx.fillStyle = a.color;
            if (len < 3) {
                // Asse "di taglio" (proiezione quasi nulla, es. Z quando rotationY ~ 0):
                // resta visibile come pallino nell'origine invece di sparire.
                ctx.beginPath();
                ctx.arc(gizmoX, gizmoY, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillText(a.label, gizmoX + 8, gizmoY + 4);
                continue;
            }
            ax = gizmoX + dx;
            ay = gizmoY + dy;
            ctx.beginPath();
            ctx.moveTo(gizmoX, gizmoY);
            ctx.lineTo(ax, ay);
            ctx.stroke();

            // Freccia piena in punta: triangolino orientato lungo l'angolo della linea.
            ang = Math.atan2(dy, dx);
            arrowLen = 6;
            leftAng = ang + Math.PI - Math.PI / 7;
            rightAng = ang + Math.PI + Math.PI / 7;
            lx = ax + arrowLen * Math.cos(leftAng);
            ly = ay + arrowLen * Math.sin(leftAng);
            rx2 = ax + arrowLen * Math.cos(rightAng);
            ry2 = ay + arrowLen * Math.sin(rightAng);
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(lx, ly);
            ctx.lineTo(rx2, ry2);
            ctx.closePath();
            ctx.fill();

            // Etichetta subito oltre la punta.
            ctx.fillText(a.label, ax + (dx / len) * 10, ay + (dy / len) * 10);
        }
    };

    var hue = 0; // tinta globale, ciclo completo sullo spettro in ~15-20s a 60fps
    var loop = function () {
        var elapsed = Date.now() - lastShapeChange;
        // Composizione una tantum: progresso 0->1 in COMPOSE_MS con easing ease-out cubico,
        // poi scala ferma a 1 per tutta la permanenza (FULL_HOLD_MS).
        var p = Math.min(1, elapsed / COMPOSE_MS);
        var ease = 1 - Math.pow(1 - p, 3);
        var sc = 0.05 + 0.95 * ease; // parte da 0.05 (non 0): i bersagli non degenerano in un punto
        pulse(sc, sc);
        hue = (hue + 0.4) % 360;

        // Auto-avanzamento: dopo composizione + permanenza, passa alla forma successiva.
        if (autoPlay && elapsed >= COMPOSE_MS + FULL_HOLD_MS) {
            setShape(nextAutoIndex(currentShapeIndex));
            updateMenuHighlight();
        }

        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, width, height);
        for (i = e.length; i--;) {
            var u = e[i];
            var q = targetPoints[u.q];
            var dx = u.x - q[0];
            var dy = u.y - q[1];
            var length = Math.sqrt(dx * dx + dy * dy);
            if (10 > length) {
                if (0.95 < rand()) {
                    u.q = ~~(rand() * heartPointsCount);
                }
                else {
                    if (0.99 < rand()) {
                        u.D *= -1;
                    }
                    u.q += u.D;
                    u.q %= heartPointsCount;
                    if (0 > u.q) {
                        u.q += heartPointsCount;
                    }
                }
            }
            u.vx += -dx / length * u.speed;
            u.vy += -dy / length * u.speed;
            u.x += u.vx;
            u.y += u.vy;
            u.vx *= u.force;
            u.vy *= u.force;
            ctx.fillStyle = "hsla(" + ~~(hue + u.hueOff) + ",100%," + u.light + "%,.9)";
            ctx.fillRect(u.x, u.y, 2, 2);
        }

        drawAxisGizmo();

        window.requestAnimationFrame(loop, canvas);
    };
    loop();
};

var s = document.readyState;
if (s === 'complete' || s === 'loaded' || s === 'interactive') init();
else document.addEventListener('DOMContentLoaded', init, false);