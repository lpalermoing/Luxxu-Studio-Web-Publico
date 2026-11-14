/* ==========================================================
   Luxxu Studio - portada.js
   Dibuja un abanico de estilo japonés (SVG) y lo abre a medida que
   se baja por la página: empieza cerrado y vertical, y termina
   abierto en media circunferencia hacia la derecha.

   El JavaScript solo calcula un número de 0 (cerrado) a 1 (abierto)
   según cuánto se bajó y gira las varillas y los paños de tela.
   El tamaño y el efecto 3D los resuelve el CSS.
   ========================================================== */
(function () {
  'use strict';

  const portada = document.querySelector('.portada');
  const escena = document.querySelector('.portada-escena');
  const abanico = document.querySelector('.abanico');
  const svg = document.getElementById('abanico-svg');

  // Si falta algo en el HTML, no hacemos nada (así la página no se rompe)
  if (!portada || !escena || !abanico || !svg) { return; }

  /* ---------- Ajustes que se pueden tocar ---------- */
  const LARGO = 300;     // largo de las varillas (en unidades del dibujo)
  const PANOS = 13;      // cantidad de paños de tela (hay una varilla más)
  const CERRADO = 5;     // grados que ocupa el abanico cerrado
  const ABIERTO = 180;   // grados con el abanico abierto: media circunferencia
  const ALCANCE = 0.9;   // el abanico termina de abrirse cuando se bajó este porcentaje de la portada

  // Colores: blanco (marfil), negro, dorado y bordó
  const MARFIL = '#fbf3e8';
  const TINTA = '#1a1214';
  const NEGRO = '#1c1517';
  const BORDO = '#7a0f1b';
  const BORDO_OSCURO = '#5d0a15';
  const LACA = '#4a0710';          // bordó muy oscuro de las varillas laterales
  const DORADO = '#b8924a';
  const DORADO_CLARO = '#e2c58a';
  const DORADO_SOMBRA = '#6b4a12';

  // Qué diseño lleva cada paño (se repite): dragón, geisha, flores de cerezo, geisha
  const DISENOS = ['dragon', 'geisha', 'sakura', 'geisha'];

  const VARILLAS = PANOS + 1;
  const R_BASE = LARGO * 0.26;     // desde dónde empieza la tela
  const R_TELA = LARGO * 0.88;     // hasta dónde llega la tela
  const R_PUNTA = R_TELA + 14;     // hasta dónde llegan las varillas finas
  const MEDIO_PANO_ABIERTO = ABIERTO / PANOS / 2; // media anchura de un paño con el abanico abierto

  const NS = 'http://www.w3.org/2000/svg';
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pendiente = false;

  /* ---------- Herramientas para armar el dibujo ---------- */
  function crear(nombre, atributos, hijos) {
    const elemento = document.createElementNS(NS, nombre);
    for (const clave in atributos) { elemento.setAttribute(clave, atributos[clave]); }
    (hijos || []).forEach(function (hijo) { elemento.appendChild(hijo); });
    return elemento;
  }

  function aRadianes(grados) { return grados * Math.PI / 180; }
  function f(numero) { return numero.toFixed(2); }

  // Media anchura de un paño abierto a una distancia r del centro
  function mitadAncho(r) { return r * Math.sin(aRadianes(MEDIO_PANO_ABIERTO)); }

  function parada(desplazamiento, color, opacidad) {
    return crear('stop', { offset: desplazamiento, 'stop-color': color, 'stop-opacity': opacidad === undefined ? 1 : opacidad });
  }

  function linea(y1, y2, ancho, color, extra) {
    const atributos = { x1: 0, y1: y1, x2: 0, y2: y2, stroke: color, 'stroke-width': ancho, 'stroke-linecap': 'round' };
    for (const clave in (extra || {})) { atributos[clave] = extra[clave]; }
    return crear('line', atributos);
  }

  function trazo(d, ancho, color, extra) {
    const atributos = { d: d, fill: 'none', stroke: color, 'stroke-width': ancho, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    for (const clave in (extra || {})) { atributos[clave] = extra[clave]; }
    return crear('path', atributos);
  }

  /* ---------- Diseño 1: flor de cerezo (sakura) ---------- */
  function flor(x, y, escala, petalo, centro) {
    const partes = [];
    for (let k = 0; k < 5; k++) {
      partes.push(crear('ellipse', {
        cx: 0, cy: -5.6, rx: 4.2, ry: 5.8, transform: 'rotate(' + (k * 72) + ')',
        fill: petalo, stroke: DORADO, 'stroke-width': 0.6
      }));
    }
    partes.push(crear('circle', { r: 2.2, fill: centro }));
    return crear('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + escala + ')' }, partes);
  }

  function petaloCaido(x, y, giro) {
    return crear('ellipse', { cx: x, cy: y, rx: 1.6, ry: 2.6, fill: MARFIL, 'fill-opacity': 0.9, transform: 'rotate(' + giro + ' ' + x + ' ' + y + ')' });
  }

  function sakura() {
    return crear('g', {}, [
      trazo('M-3 -98 C7 -140 -7 -182 3 -242', 1.7, DORADO),
      trazo('M0 -150 Q9 -156 14 -168', 1.1, DORADO),
      trazo('M0 -192 Q-9 -198 -13 -209', 1.1, DORADO),
      trazo('M-2 -122 Q-8 -126 -9 -134', 1.1, DORADO),
      flor(14, -168, 0.85, MARFIL, DORADO),
      flor(-13, -209, 0.95, MARFIL, DORADO),
      flor(3, -238, 0.78, MARFIL, DORADO),
      flor(-8, -134, 0.7, MARFIL, DORADO),
      flor(2, -112, 0.55, MARFIL, DORADO),
      petaloCaido(-14, -160, 30), petaloCaido(13, -192, -20), petaloCaido(-5, -222, 50),
      petaloCaido(11, -130, 10), petaloCaido(-12, -118, -40), petaloCaido(9, -224, 25)
    ]);
  }

  /* ---------- Diseño 2: geisha (de pie, con kimono bordó) ---------- */
  function geisha() {
    return crear('g', {}, [
      // mangas largas
      crear('path', { d: 'M-7 -207 Q-15 -192 -14 -146 L-8.5 -150 Q-8 -176 -7 -192 Z', fill: BORDO_OSCURO, stroke: DORADO, 'stroke-width': 0.5 }),
      crear('path', { d: 'M7 -207 Q15 -192 14 -146 L8.5 -150 Q8 -176 7 -192 Z', fill: BORDO_OSCURO, stroke: DORADO, 'stroke-width': 0.5 }),
      // kimono
      crear('path', { d: 'M-8 -210 Q-9.5 -165 -12 -108 L12 -108 Q9.5 -165 8 -210 Q0 -205 -8 -210 Z', fill: BORDO, stroke: DORADO, 'stroke-width': 0.6 }),
      trazo('M-11.6 -114 Q0 -110 11.6 -114', 1.2, DORADO_CLARO),
      // flores doradas en el kimono
      crear('circle', { cx: -5, cy: -132, r: 1.8, fill: DORADO_CLARO }),
      crear('circle', { cx: 5, cy: -141, r: 1.8, fill: DORADO_CLARO }),
      crear('circle', { cx: -3, cy: -121, r: 1.5, fill: DORADO_CLARO }),
      crear('circle', { cx: 6, cy: -125, r: 1.3, fill: DORADO_CLARO }),
      // cuello en V
      trazo('M-6 -211 L0 -188 L6 -211', 2, MARFIL),
      // faja (obi)
      crear('rect', { x: -10, y: -170, width: 20, height: 17, rx: 1.5, fill: '#c79a3f', stroke: DORADO_SOMBRA, 'stroke-width': 0.5 }),
      trazo('M-8 -165.5 H8 M-8 -161.5 H8 M-8 -157.5 H8', 0.5, DORADO_SOMBRA, { 'stroke-opacity': 0.7 }),
      // cuello y cara
      crear('rect', { x: -2.2, y: -217, width: 4.4, height: 8, fill: MARFIL }),
      crear('ellipse', { cx: 0, cy: -224, rx: 6.2, ry: 7.6, fill: MARFIL, stroke: '#2a1a1d', 'stroke-width': 0.5 }),
      // peinado
      crear('path', { d: 'M-6.6 -225 Q-7.5 -236 0 -237 Q7.5 -236 6.6 -225 Q4 -231 0 -230 Q-4 -231 -6.6 -225 Z', fill: TINTA }),
      crear('ellipse', { cx: 0, cy: -241, rx: 7, ry: 4.5, fill: TINTA }),
      crear('ellipse', { cx: 0, cy: -247, rx: 3.4, ry: 2.6, fill: TINTA }),
      // adornos dorados del pelo (kanzashi)
      trazo('M-8 -243 L-16 -252 M8 -243 L16 -252', 1, DORADO_CLARO),
      crear('circle', { cx: -16, cy: -252, r: 1.8, fill: DORADO_CLARO }),
      crear('circle', { cx: 16, cy: -252, r: 1.8, fill: DORADO_CLARO }),
      trazo('M-5 -246 Q0 -251 5 -246', 1.3, DORADO_CLARO),
      // cara: ojos y labios
      trazo('M-3.6 -224.5 h2.2 M1.4 -224.5 h2.2', 0.8, '#2a1a1d'),
      crear('ellipse', { cx: 0, cy: -219.2, rx: 1.5, ry: 0.9, fill: '#9a1220' })
    ]);
  }

  /* ---------- Diseño 3: dragón dorado (se calcula con matemática) ---------- */
  function nube(x, y, escala, giro) {
    return trazo('M0 0 C0 -3.2 4.6 -3.4 4.6 0 C4.6 3 0.6 3.6 -0.6 1 M4.6 0 C7 -0.6 9 1 8.5 3.2', 0.9, DORADO_CLARO,
      { transform: 'translate(' + x + ' ' + y + ') rotate(' + giro + ') scale(' + escala + ')' });
  }

  function dragon() {
    const PASOS = 56, R0 = 104, R1 = 230;
    const puntos = [];
    for (let k = 0; k <= PASOS; k++) {
      const t = k / PASOS;
      const r = R0 + (R1 - R0) * t;
      puntos.push({ t: t, x: 0.6 * mitadAncho(r) * Math.sin(2 * Math.PI * 1.75 * t + 0.5), y: -r });
    }
    // Para cada punto del cuerpo: hacia dónde avanza, su perpendicular y su grosor
    puntos.forEach(function (p, k) {
      const a = puntos[Math.max(0, k - 1)], b = puntos[Math.min(PASOS, k + 1)];
      let dx = b.x - a.x, dy = b.y - a.y;
      const largo = Math.sqrt(dx * dx + dy * dy);
      dx /= largo; dy /= largo;
      p.tx = dx; p.ty = dy; p.nx = -dy; p.ny = dx;
      p.w = 1.4 + 6.6 * Math.sin(Math.PI * Math.pow(p.t, 0.75) * 0.8);
    });

    // Cuerpo: un contorno que sube por un lado y baja por el otro
    let ida = '', vuelta = '', espinas = '', eje = '';
    puntos.forEach(function (p, k) {
      ida += (k ? ' L' : 'M') + f(p.x + p.nx * p.w / 2) + ' ' + f(p.y + p.ny * p.w / 2);
      eje += (k ? ' L' : 'M') + f(p.x) + ' ' + f(p.y);
    });
    for (let k = PASOS; k >= 0; k--) {
      const p = puntos[k];
      vuelta += ' L' + f(p.x - p.nx * p.w / 2) + ' ' + f(p.y - p.ny * p.w / 2);
    }
    // Espinas del lomo
    for (let k = 3; k < PASOS - 3; k += 3) {
      const p = puntos[k], q = puntos[k + 1];
      const a = { x: p.x + p.nx * p.w / 2, y: p.y + p.ny * p.w / 2 };
      const b = { x: q.x + q.nx * q.w / 2, y: q.y + q.ny * q.w / 2 };
      const punta = { x: (a.x + b.x) / 2 + p.nx * 3.6 + p.tx * 1.4, y: (a.y + b.y) / 2 + p.ny * 3.6 + p.ty * 1.4 };
      espinas += 'M' + f(a.x) + ' ' + f(a.y) + ' L' + f(punta.x) + ' ' + f(punta.y) + ' L' + f(b.x) + ' ' + f(b.y) + ' Z ';
    }

    // Patas con garras
    function pata(k, lado) {
      const p = puntos[k];
      const sx = p.x + lado * p.w * 0.4, sy = p.y;
      const ex = sx + lado * 11, ey = sy - 1;
      return crear('g', {}, [
        trazo('M' + f(sx) + ' ' + f(sy) + ' Q' + f(sx + lado * 6) + ' ' + f(sy + 4) + ' ' + f(ex) + ' ' + f(ey), 1.5, DORADO_CLARO),
        trazo('M' + f(ex) + ' ' + f(ey) + ' l' + f(lado * 3.4) + ' -2.6 M' + f(ex) + ' ' + f(ey) + ' l' + f(lado * 4) + ' -0.2 M' + f(ex) + ' ' + f(ey) + ' l' + f(lado * 2.6) + ' 2.6', 0.9, DORADO_CLARO)
      ]);
    }

    // Cabeza, con cuernos y bigotes largos, mirando hacia donde sigue el cuerpo
    const cola = puntos[PASOS];
    const giro = Math.atan2(cola.tx, -cola.ty) * 180 / Math.PI;
    const cabeza = crear('g', { transform: 'translate(' + f(cola.x) + ' ' + f(cola.y) + ') rotate(' + f(giro) + ')' }, [
      trazo('M-5 -3 Q-14 -6 -17 -17 M5 -3 Q14 -6 17 -17', 0.9, DORADO_CLARO),
      trazo('M-4 -9 Q-15 -11 -19 -24 M4 -9 Q15 -11 19 -24', 0.8, DORADO_CLARO),
      trazo('M-3 -9 Q-9 -14 -8 -22 M3 -9 Q9 -14 8 -22', 1.4, DORADO),
      crear('path', { d: 'M-5 2 C-6.5 -4 -5 -11 -1.8 -15 L0 -17.5 L1.8 -15 C5 -11 6.5 -4 5 2 Z', fill: 'url(#oro-vivo)', stroke: DORADO_SOMBRA, 'stroke-width': 0.4 }),
      crear('circle', { cx: -2.6, cy: -8.5, r: 1.5, fill: MARFIL }),
      crear('circle', { cx: 2.6, cy: -8.5, r: 1.5, fill: MARFIL }),
      crear('circle', { cx: -2.6, cy: -8.5, r: 0.7, fill: TINTA }),
      crear('circle', { cx: 2.6, cy: -8.5, r: 0.7, fill: TINTA })
    ]);

    return crear('g', {}, [
      nube(-17, -148, 1, 0), nube(16, -122, 1, 180), nube(-18, -206, 0.9, 10), nube(18, -176, 0.9, 170),
      crear('path', { d: ida + vuelta + ' Z', fill: 'url(#oro-vivo)', stroke: DORADO_SOMBRA, 'stroke-width': 0.4 }),
      crear('path', { d: espinas, fill: DORADO_CLARO }),
      trazo(eje, 1.2, NEGRO, { 'stroke-opacity': 0.55, 'stroke-dasharray': '1.4 2.4' }),
      pata(20, -1), pata(24, 1), pata(36, -1), pata(40, 1),
      cabeza,
      crear('circle', { cx: 19, cy: -213, r: 5.5, fill: DORADO_CLARO, 'fill-opacity': 0.3 }),
      crear('circle', { cx: 19, cy: -213, r: 3.4, fill: MARFIL, stroke: DORADO, 'stroke-width': 0.6 })
    ]);
  }

  /* ---------- Armado del abanico (se hace una sola vez) ---------- */
  svg.replaceChildren();
  svg.setAttribute('viewBox', '-22 -318 344 636');
  svg.setAttribute('preserveAspectRatio', 'xMinYMid meet');

  const defs = crear('defs', {}, [
    crear('radialGradient', { id: 'seda-marfil', gradientUnits: 'userSpaceOnUse', cx: 0, cy: 0, r: LARGO }, [
      parada(0, '#cbbda3'), parada(0.5, '#eadfcb'), parada(1, '#f8f1e4')
    ]),
    crear('radialGradient', { id: 'seda-negra', gradientUnits: 'userSpaceOnUse', cx: 0, cy: 0, r: LARGO }, [
      parada(0, '#0f0a0c'), parada(0.6, NEGRO), parada(1, '#33191f')
    ]),
    crear('radialGradient', { id: 'seda-bordo', gradientUnits: 'userSpaceOnUse', cx: 0, cy: 0, r: LARGO }, [
      parada(0, '#3f060e'), parada(0.5, '#6c0d1a'), parada(1, '#8c1426')
    ]),
    crear('linearGradient', { id: 'pliegue-a', x1: 0, y1: 0, x2: 1, y2: 0 }, [
      parada(0, '#fff', 0.2), parada(0.5, '#fff', 0), parada(1, '#000', 0.26)
    ]),
    crear('linearGradient', { id: 'pliegue-b', x1: 1, y1: 0, x2: 0, y2: 0 }, [
      parada(0, '#fff', 0.14), parada(0.5, '#fff', 0), parada(1, '#000', 0.26)
    ]),
    crear('linearGradient', { id: 'oro-vivo', x1: 0, y1: 0, x2: 1, y2: 0 }, [
      parada(0, '#9c7430'), parada(0.5, '#f0d99b'), parada(1, DORADO)
    ]),
    crear('radialGradient', { id: 'oro-remache', cx: 0.35, cy: 0.35, r: 0.8 }, [
      parada(0, '#f6e3b0'), parada(1, DORADO)
    ])
  ]);
  svg.appendChild(defs);

  // 1) Paños de tela: cada uno con su color y su diseño
  const ESTILOS = {
    dragon: { seda: 'url(#seda-negra)', borde: DORADO_CLARO, dibujo: dragon },
    geisha: { seda: 'url(#seda-marfil)', borde: '#a87f35', dibujo: geisha },
    sakura: { seda: 'url(#seda-bordo)', borde: DORADO_CLARO, dibujo: sakura }
  };
  const grupoPanos = crear('g', {});
  const panos = [];
  for (let i = 0; i < PANOS; i++) {
    const estilo = ESTILOS[DISENOS[i % DISENOS.length]];
    const papel = crear('path', { fill: estilo.seda });
    const pliegue = crear('path', { fill: i % 2 === 0 ? 'url(#pliegue-a)' : 'url(#pliegue-b)' });
    const borde = crear('path', { fill: 'none', stroke: estilo.borde, 'stroke-width': 1.4, 'stroke-linejoin': 'round' });
    const filete = crear('path', { fill: 'none', stroke: estilo.borde, 'stroke-width': 0.8, 'stroke-opacity': 0.8 });
    const adorno = estilo.dibujo();
    const recorte = crear('path', {});
    defs.appendChild(crear('clipPath', { id: 'recorte-' + i }, [recorte]));
    const dentro = crear('g', { 'clip-path': 'url(#recorte-' + i + ')' }, [adorno]);
    const ornamentos = crear('g', {}, [dentro, borde, filete]);
    const grupo = crear('g', {}, [papel, pliegue, ornamentos]);
    grupoPanos.appendChild(grupo);
    panos.push({ grupo: grupo, papel: papel, pliegue: pliegue, recorte: recorte, borde: borde, filete: filete, adorno: adorno, ornamentos: ornamentos });
  }
  svg.appendChild(grupoPanos);

  // 2) Varillas: las dos de los costados son más anchas y decoradas
  const grupoVarillas = crear('g', {});
  const varillas = [];
  for (let j = 0; j < VARILLAS; j++) {
    let partes;
    if (j === 0 || j === VARILLAS - 1) {
      partes = [
        linea(6, -LARGO, 14, DORADO),
        linea(6, -LARGO, 10.5, LACA),
        linea(-44, -LARGO + 20, 2, DORADO_CLARO, { 'stroke-dasharray': '0.1 6.5' }),
        linea(-62, -62, 2.2, DORADO_CLARO, { x1: -5.2, x2: 5.2, 'stroke-linecap': 'butt' }),
        crear('circle', { cx: 0, cy: -LARGO + 1, r: 3.4, fill: DORADO_CLARO })
      ];
    } else {
      partes = [
        linea(5, -R_PUNTA, 4.6, DORADO, { 'stroke-opacity': 0.7 }),
        linea(5, -R_PUNTA, 3, NEGRO),
        crear('circle', { cx: 0, cy: -R_PUNTA, r: 1.9, fill: DORADO_CLARO })
      ];
    }
    const grupo = crear('g', {}, partes);
    grupoVarillas.appendChild(grupo);
    varillas.push(grupo);
  }
  svg.appendChild(grupoVarillas);

  // 3) Remache dorado en el centro
  svg.appendChild(crear('g', {}, [
    crear('circle', { r: 14, fill: '#3a060c', stroke: DORADO, 'stroke-width': 1.4 }),
    crear('circle', { r: 9.5, fill: 'url(#oro-remache)' }),
    crear('circle', { r: 3.2, fill: '#3a060c' })
  ]));

  /* ---------- Formas de los paños (dependen de cuánto está abierto) ---------- */
  function formas(medioPano) {
    const a = aRadianes(medioPano);
    const punto = function (r) { return { x: r * Math.sin(a), y: r * Math.cos(a) }; };

    const base = punto(R_BASE);
    const tela = punto(R_TELA);
    const fino = punto(R_TELA - 12);
    const festonTela = Math.max(1.4 * tela.x, 0.01); // radio de la curva del borde de arriba
    const festonFino = Math.max(1.4 * fino.x, 0.01);

    return {
      papel: 'M' + f(-base.x) + ' ' + f(-base.y) +
             ' L' + f(-tela.x) + ' ' + f(-tela.y) +
             ' A' + f(festonTela) + ' ' + f(festonTela) + ' 0 0 1 ' + f(tela.x) + ' ' + f(-tela.y) +
             ' L' + f(base.x) + ' ' + f(-base.y) +
             ' A' + f(R_BASE) + ' ' + f(R_BASE) + ' 0 0 0 ' + f(-base.x) + ' ' + f(-base.y) + ' Z',
      borde: 'M' + f(-tela.x) + ' ' + f(-tela.y) +
             ' A' + f(festonTela) + ' ' + f(festonTela) + ' 0 0 1 ' + f(tela.x) + ' ' + f(-tela.y) +
             ' M' + f(-base.x) + ' ' + f(-base.y) +
             ' A' + f(R_BASE) + ' ' + f(R_BASE) + ' 0 0 1 ' + f(base.x) + ' ' + f(-base.y),
      filete: 'M' + f(-fino.x) + ' ' + f(-fino.y) +
              ' A' + f(festonFino) + ' ' + f(festonFino) + ' 0 0 1 ' + f(fino.x) + ' ' + f(-fino.y)
    };
  }

  /* ---------- Dibujar el abanico con un avance de 0 a 1 ---------- */
  function dibujar(avance) {
    const total = CERRADO + (ABIERTO - CERRADO) * avance;  // grados abiertos
    const paso = total / PANOS;                            // grados entre varilla y varilla
    const inicio = -CERRADO / 2 * (1 - avance);            // cerrado: centrado; abierto: arranca arriba
    const medioPano = paso / 2;
    const forma = formas(medioPano);
    const ancho = Math.min(1, medioPano / MEDIO_PANO_ABIERTO);        // la tela se pliega al cerrar
    const visibilidad = Math.min(1, Math.max(0, (avance - 0.12) / 0.6)); // los diseños aparecen al abrir

    panos.forEach(function (pano, i) {
      pano.grupo.setAttribute('transform', 'rotate(' + (inicio + (i + 0.5) * paso).toFixed(2) + ')');
      pano.papel.setAttribute('d', forma.papel);
      pano.pliegue.setAttribute('d', forma.papel);
      pano.recorte.setAttribute('d', forma.papel);
      pano.borde.setAttribute('d', forma.borde);
      pano.filete.setAttribute('d', forma.filete);
      pano.adorno.setAttribute('transform', 'scale(' + ancho.toFixed(3) + ' 1)');
      pano.ornamentos.setAttribute('opacity', visibilidad.toFixed(3));
    });

    varillas.forEach(function (varilla, j) {
      varilla.setAttribute('transform', 'rotate(' + (inicio + j * paso).toFixed(2) + ')');
    });

    // El CSS usa este número para el efecto 3D
    abanico.style.setProperty('--abrir', avance.toFixed(3));
  }

  /* ---------- Cuánto se abrió, según lo que se bajó ---------- */
  function avanceActual() {
    // Si la persona pidió "reducir movimiento": abanico abierto y quieto
    if (sinMovimiento.matches) { return 1; }
    const recorrido = escena.offsetHeight * ALCANCE;
    if (recorrido <= 0) { return 1; }
    const t = Math.min(1, Math.max(0, window.scrollY / recorrido));
    return 1 - Math.pow(1 - t, 1.4); // se abre un poco más rápido al principio
  }

  function actualizar() {
    pendiente = false;
    dibujar(avanceActual());
  }

  function alBajar() {
    // requestAnimationFrame: pide dibujar una vez por cuadro, no en cada pixel de scroll
    if (!pendiente) {
      pendiente = true;
      window.requestAnimationFrame(actualizar);
    }
  }

  portada.classList.add('portada-lista');
  actualizar();
  window.addEventListener('scroll', alBajar, { passive: true });
  window.addEventListener('resize', alBajar);
  window.addEventListener('load', alBajar);
})();