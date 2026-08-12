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
    var canvas = document.getElementById('heart');
    var ctx = canvas.getContext('2d');
    var width = canvas.width = koef * innerWidth;
    var height = canvas.height = koef * innerHeight;
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

    window.addEventListener('resize', function () {
        width = canvas.width = koef * innerWidth;
        height = canvas.height = koef * innerHeight;
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, width, height);
    });

    var traceCount = mobile ? 20 : 50;
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
        [0.10, -1.00], [0.55, -0.55], [0.15, -0.30], [0.60, -0.05], [0.00, 1.00],
        [-0.15, 0.30], [-0.55, 0.15], [-0.10, -0.10], [-0.60, -0.50], [-0.15, -0.80]
    ];
    var boltN = boltVertices.length;

    // Forma "Testo": campiona una scritta disegnata su un canvas offscreen.
    var currentText = ""; // vuoto = nessun testo ancora inserito dall'utente
    var textCanvas = document.createElement('canvas');
    textCanvas.width = 800;
    textCanvas.height = 200;
    var textCtx = textCanvas.getContext('2d');
    var getTextPoints = function (totalCount) {
        var w = textCanvas.width, h = textCanvas.height;
        textCtx.clearRect(0, 0, w, h);
        textCtx.fillStyle = "#fff";
        textCtx.textAlign = "center";
        textCtx.textBaseline = "middle";
        var fontSize = 140;
        textCtx.font = "bold " + fontSize + "px sans-serif";
        var maxWidth = w * 0.9;
        while (textCtx.measureText(currentText).width > maxWidth && fontSize > 10) {
            fontSize -= 4;
            textCtx.font = "bold " + fontSize + "px sans-serif";
        }
        textCtx.fillText(currentText, w / 2, h / 2);

        var data = textCtx.getImageData(0, 0, w, h).data;
        var stride = 2; // passo di campionamento: limita i pixel candidati senza perdere la forma
        var candidates = [];
        var x, y, idx3;
        for (y = 0; y < h; y += stride) {
            for (x = 0; x < w; x += stride) {
                idx3 = (y * w + x) * 4 + 3; // canale alpha
                if (data[idx3] > 128) {
                    candidates.push([x - w / 2, y - h / 2]); // centrato sull'origine
                }
            }
        }
        // Ordina per x poi y: coerenza locale, così le particelle che camminano sugli indici
        // adiacenti (u.q += u.D) restano sulla stessa lettera invece di saltare tra lettere diverse.
        candidates.sort(function (a, b) {
            return (a[0] - b[0]) || (a[1] - b[1]);
        });
        var out = [];
        var n = candidates.length;
        var j2;
        if (n === 0) {
            // Nessun pixel (testo vuoto o non renderizzabile): fallback difensivo, tutti al centro.
            for (j2 = 0; j2 < totalCount; j2++) out.push([0, 0]);
            return out;
        }
        for (j2 = 0; j2 < totalCount; j2++) {
            out.push(candidates[~~(j2 * n / totalCount)]);
        }
        return out;
    };

    // Registro delle forme disponibili: ognuna ha un dominio (tMax) e una funzione
    // parametrica fn(t) -> [x, y] in coordinate "grezze" (prima della normalizzazione).
    var shapes = [
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
            name: "Infinito",
            tMax: Math.PI * 2, // lemniscata di Bernoulli
            fn: function (t) {
                var s2 = Math.sin(t) * Math.sin(t);
                return [Math.cos(t) / (1 + s2), Math.sin(t) * Math.cos(t) / (1 + s2)];
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
            name: "Lissajous",
            tMax: Math.PI * 2,
            fn: function (t) {
                return [Math.sin(3 * t + Math.PI / 2), Math.sin(2 * t)];
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
            name: "Astroide",
            tMax: Math.PI * 2,
            fn: function (t) {
                var c = Math.cos(t), s = Math.sin(t);
                return [c * c * c, s * s * s];
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
            name: "Cardioide",
            tMax: Math.PI * 2,
            fn: function (t) {
                var r = 1 - Math.sin(t);
                return [r * Math.cos(t), r * Math.sin(t)];
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
            name: "Lissajous 5:4",
            tMax: Math.PI * 2,
            fn: function (t) {
                return [Math.sin(5 * t + Math.PI / 2), Math.sin(4 * t)];
            }
        },
        {
            name: "Luna",
            tMax: 2, // metà dominio per arco
            fn: function (t) {
                if (t < 1) {
                    // arco esterno: cerchio unitario, da -110° a +110° (passando per 0°)
                    var ang = (-110 + 220 * t) * Math.PI / 180;
                    return [Math.cos(ang), Math.sin(ang)];
                } else {
                    // arco interno di ritorno: cerchio centro (0.55,0) raggio 1.296, da 133.5° a 226.5°
                    var u = t - 1;
                    var ang2 = (133.5 + 93 * u) * Math.PI / 180;
                    return [0.55 + 1.296 * Math.cos(ang2), 1.296 * Math.sin(ang2)];
                }
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
            name: "Testo",
            getPoints: getTextPoints
        }
    ];

    // Numero di campioni per forma: costante per tutte le forme così il numero totale
    // di punti (e quindi il numero di particelle) non cambia mai al cambio forma.
    var shapePointCount = mobile ? 21 : 63;
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
    // massima a ~230px e genera i 3 anelli concentrici. Le forme con getPoints (es. Testo)
    // forniscono invece direttamente i 3*N punti finali: niente anelli, altrimenti il
    // contorno verrebbe triplicato sprecando particelle.
    var buildPoints = function (shape) {
        var raw, j, t, maxAbs, scale, pts;

        if (shape.getPoints) {
            raw = shape.getPoints(shapePointCount * ringFactors.length);
            maxAbs = 0;
            for (j = 0; j < raw.length; j++) {
                maxAbs = Math.max(maxAbs, Math.abs(raw[j][0]), Math.abs(raw[j][1]));
            }
            scale = maxAbs > 0 ? 230 / maxAbs : 1;
            pts = [];
            for (j = 0; j < raw.length; j++) {
                pts.push(scaleAndTranslate(raw[j], scale, scale, 0, 0));
            }
            return pts;
        }

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
        scale = maxAbs > 0 ? 230 / maxAbs : 1;
        pts = [];
        var f;
        for (f = 0; f < ringFactors.length; f++) {
            for (j = 0; j < raw.length; j++) {
                pts.push(scaleAndTranslate(raw[j], scale * ringFactors[f], scale * ringFactors[f], 0, 0));
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
        for (i = 0; i < pointsOrigin.length; i++) {
            targetPoints[i] = [];
            targetPoints[i][0] = kx * pointsOrigin[i][0] + width / 2;
            targetPoints[i][1] = ky * pointsOrigin[i][1] + height / 2;
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
            trace: []
        };
        for (var k = 0; k < traceCount; k++) e[i].trace[k] = { x: x, y: y };
    }

    // Menu flottante a sinistra: le voci sono generate dal registro "shapes" (nessun nome
    // hardcoded in HTML). L'ultima voce del registro è sempre "Testo" (ha getPoints invece
    // di tMax/fn): non è una voce di lista normale, ha la riga dedicata con l'input.
    var textShapeIndex = shapes.length - 1;
    var shapeMenuList = document.getElementById('shapeMenuList');
    var shapeMenuText = document.getElementById('shapeMenuText');
    var shapeTextInput = document.getElementById('shapeTextInput');
    var shapeTextConfirm = document.getElementById('shapeTextConfirm');

    // Aggiorna l'evidenziazione della voce attiva nel menu (usata da clic e auto-avanzamento).
    var updateMenuHighlight = function () {
        if (shapeMenuList) {
            var items = shapeMenuList.children;
            for (var idx = 0; idx < items.length; idx++) {
                items[idx].className = (idx === currentShapeIndex) ? 'active' : '';
            }
        }
        if (shapeMenuText) {
            shapeMenuText.className = (currentShapeIndex === textShapeIndex) ? 'active' : '';
        }
    };

    // Prossimo indice per l'auto-avanzamento: salta "Testo" se l'utente non ha ancora
    // confermato una scritta (la voce Testo entra nel ciclo automatico solo dopo la conferma).
    var nextAutoIndex = function (fromIndex) {
        var next = (fromIndex + 1) % shapes.length;
        if (next === textShapeIndex && currentText.length === 0) {
            next = (next + 1) % shapes.length;
        }
        return next;
    };

    if (shapeMenuList) {
        for (i = 0; i < shapes.length; i++) {
            if (i === textShapeIndex) continue; // "Testo" ha la sua riga dedicata, non una voce di lista
            (function (idx) {
                var li = document.createElement('li');
                li.textContent = shapes[idx].name;
                li.addEventListener('click', function () {
                    setShape(idx);
                    updateMenuHighlight();
                });
                shapeMenuList.appendChild(li);
            })(i);
        }
    }

    if (shapeTextInput && shapeTextConfirm) {
        shapeTextInput.placeholder = shapes[textShapeIndex].name;
        var applyText = function () {
            var val = shapeTextInput.value.replace(/^\s+|\s+$/g, ''); // trim
            if (val.length === 0) return; // testo vuoto: non applicato
            currentText = val;
            setShape(textShapeIndex);
            updateMenuHighlight();
        };
        shapeTextConfirm.addEventListener('click', applyText);
        shapeTextInput.addEventListener('keydown', function (ev) {
            if (ev.keyCode === 13) applyText();
        });
    }

    updateMenuHighlight();

    var config = {
        traceK: 0.4
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

        // Auto-avanzamento: dopo composizione + permanenza, passa alla forma successiva
        // (saltando "Testo" se non è ancora stato inserito nessun testo).
        if (elapsed >= COMPOSE_MS + FULL_HOLD_MS) {
            setShape(nextAutoIndex(currentShapeIndex));
            updateMenuHighlight();
        }

        ctx.fillStyle = "rgba(0,0,0,.1)";
        ctx.fillRect(0, 0, width, height);
        for (i = e.length; i--;) {
            var u = e[i];
            var q = targetPoints[u.q];
            var dx = u.trace[0].x - q[0];
            var dy = u.trace[0].y - q[1];
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
            u.trace[0].x += u.vx;
            u.trace[0].y += u.vy;
            u.vx *= u.force;
            u.vy *= u.force;
            for (k = 0; k < u.trace.length - 1;) {
                var T = u.trace[k];
                var N = u.trace[++k];
                N.x -= config.traceK * (N.x - T.x);
                N.y -= config.traceK * (N.y - T.y);
            }
            ctx.fillStyle = "hsla(" + ~~(hue + u.hueOff) + ",100%," + u.light + "%,.3)";
            for (k = 0; k < u.trace.length; k++) {
                ctx.fillRect(u.trace[k].x, u.trace[k].y, 1, 1);
            }
        }
        //ctx.fillStyle = "rgba(255,255,255,1)";
        //for (i = u.trace.length; i--;) ctx.fillRect(targetPoints[i][0], targetPoints[i][1], 2, 2);

        window.requestAnimationFrame(loop, canvas);
    };
    loop();
};

var s = document.readyState;
if (s === 'complete' || s === 'loaded' || s === 'interactive') init();
else document.addEventListener('DOMContentLoaded', init, false);