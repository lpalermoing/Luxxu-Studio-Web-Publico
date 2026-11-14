/* ==========================================================
   Luxxu Studio - servicios.js
   Hace cuatro cosas en "Nuestros servicios" (uñas, pestañas y cejas, cursos) y "Combos especiales" (el carrusel y la aparición suave
   también los usan los videos de TikTok):
   1) las flechas del carrusel (mover las tarjetas de a poco)
   2) los filtros Todos / Uñas / Pestañas y cejas / Cursos
   3) que las tarjetas aparezcan suavemente al llegar a ellas
   4) los botones de información (Nail art y adicionales / Press On / Cursos)

   No toca precios ni el armado del turno: eso lo hace reserva.js.
   Los filtros solo ESCONDEN tarjetas (atributo hidden), nunca las borran:
   así lo que la clienta ya eligió no se pierde al cambiar de filtro.
   ========================================================== */
(function () {
  'use strict';

  // Si la persona pidió "reducir movimiento" en su celular o compu, no animamos
  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const puedeAnimar = !reducirMovimiento && 'IntersectionObserver' in window;

  /* ---------- 1) Carruseles (hay uno de servicios y otro de combos) ---------- */
  const carruseles = [];   // guardamos la función "actualizar" de cada uno para usarla desde los filtros

  document.querySelectorAll('.carrusel').forEach(function (carrusel) {
    const pista = carrusel.querySelector('.tarjetas');
    const flechas = carrusel.querySelectorAll('.flecha');
    if (!pista) { return; }

    // Prende o apaga cada flecha según hasta dónde se desplazó la pista
    function actualizar() {
      const sobra = pista.scrollWidth - pista.clientWidth;   // cuánto contenido queda fuera de pantalla
      const entranTodas = sobra <= 2;
      pista.classList.toggle('centrada', entranTodas);        // si entran todas, quedan centradas
      flechas.forEach(function (flecha) {
        flecha.hidden = entranTodas;                          // si entran todas, no hacen falta las flechas
        const direccion = Number(flecha.dataset.dir);
        flecha.disabled = direccion < 0 ? pista.scrollLeft <= 2 : pista.scrollLeft >= sobra - 2;
      });
    }

    // Mueve la pista una "tanda" de tarjetas (siempre de a tarjetas enteras, para que encajen)
    function mover(direccion) {
      const primera = pista.querySelector(':scope > li:not([hidden])');
      if (!primera) { return; }
      const hueco = parseFloat(getComputedStyle(pista).columnGap) || 0;
      const paso = primera.offsetWidth + hueco;                           // lo que ocupa una tarjeta
      const entran = Math.floor(pista.clientWidth / paso);                // cuántas se ven enteras
      const cuantas = Math.max(1, entran > 2 ? entran - 1 : entran);      // deja una a la vista para no perder el hilo
      pista.scrollBy({
        left: direccion * cuantas * paso,
        behavior: reducirMovimiento ? 'auto' : 'smooth'
      });
    }

    flechas.forEach(function (flecha) {
      flecha.addEventListener('click', function () { mover(Number(flecha.dataset.dir)); });
    });

    pista.addEventListener('scroll', actualizar, { passive: true });
    window.addEventListener('resize', actualizar);
    window.addEventListener('load', actualizar);
    actualizar();

    carruseles.push({ pista: pista, actualizar: actualizar });
  });

  /* ---------- 3) Aparición fade-up (se prepara antes de los filtros porque ellos la reutilizan) ---------- */

  // Hace aparecer, una tras otra, las tarjetas que están a la vista en esa pista
  function mostrarConAnimacion(pista) {
    const visibles = pista.querySelectorAll(':scope > li:not([hidden])');
    visibles.forEach(function (tarjeta, i) {
      tarjeta.style.setProperty('--retraso', Math.min(i, 5) * 0.08 + 's');   // pequeño escalonado entre vecinas
      tarjeta.classList.add('visible');
    });
  }

  if (puedeAnimar) {
    const observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          mostrarConAnimacion(entrada.target);   // aparecen todas las tarjetas de esa pista juntas
          observador.unobserve(entrada.target);  // una vez aparecidas, no se vuelven a esconder
        }
      });
    }, { threshold: 0.2 });

    carruseles.forEach(function (carrusel) {
      carrusel.pista.querySelectorAll(':scope > li').forEach(function (tarjeta) { tarjeta.classList.add('revelar'); });
      observador.observe(carrusel.pista);
    });
  }

  /* ---------- Fotos de las tarjetas: si falta un archivo, se ve un símbolo y la consola avisa cuál es ----------
     Así, si una foto no aparece, se puede ver en la consola del navegador (F12) la ruta exacta que hay que revisar. */
  document.querySelectorAll('.tarjeta-circulo img').forEach(function (imagen) {
    function falta() {
      imagen.closest('.tarjeta-circulo').classList.add('sin-foto');
      console.warn('[Luxxu Studio] No se encontró la foto: ' + imagen.getAttribute('src') +
                   '. Revisá que el archivo esté en esa carpeta y con ese nombre exacto.');
    }
    imagen.addEventListener('error', falta);
    if (imagen.complete && imagen.getAttribute('src') && imagen.naturalWidth === 0) { falta(); }
  });

  /* ---------- 2) Filtros de "Nuestros servicios" ---------- */
  const pistaServicios = document.getElementById('pista-servicios');
  const botonesFiltro = document.querySelectorAll('.filtro');
  const mensajeFiltro = document.getElementById('filtro-estado');
  const NOMBRES_FILTRO = { unas: 'uñas', 'pestanas-cejas': 'pestañas y cejas' };

  if (pistaServicios && botonesFiltro.length) {
    const tarjetasServicios = pistaServicios.querySelectorAll('.tarjeta');
    const carruselServicios = carruseles.find(function (c) { return c.pista === pistaServicios; });

    function aplicarFiltro(filtro) {
      botonesFiltro.forEach(function (boton) {
        boton.setAttribute('aria-pressed', String(boton.dataset.filtro === filtro));
      });

      // Primero se esconden todas y se les saca "visible"; se fuerza un repintado para que el navegador
      // las tome como recién llegadas (así vuelven a aparecer con el fade-up en vez de animarse al revés)
      tarjetasServicios.forEach(function (tarjeta) {
        tarjeta.hidden = true;
        tarjeta.classList.remove('visible');
      });
      void pistaServicios.offsetWidth;

      // Después se muestran solo las que corresponden al filtro
      let cantidad = 0;
      tarjetasServicios.forEach(function (tarjeta) {
        if (filtro === 'todos' || tarjeta.dataset.categoria === filtro) {
          tarjeta.hidden = false;
          cantidad++;
        }
      });
      pistaServicios.scrollLeft = 0;       // se vuelve al principio
      void pistaServicios.offsetWidth;

      if (puedeAnimar) { mostrarConAnimacion(pistaServicios); }
      if (carruselServicios) { carruselServicios.actualizar(); }

      // Aviso para lectores de pantalla
      if (mensajeFiltro) {
        if (filtro === 'todos') { mensajeFiltro.textContent = 'Mostrando todos: ' + cantidad + ' servicios y cursos.'; }
        else if (filtro === 'cursos') { mensajeFiltro.textContent = 'Mostrando ' + cantidad + (cantidad === 1 ? ' curso.' : ' cursos.'); }
        else { mensajeFiltro.textContent = 'Mostrando ' + cantidad + (cantidad === 1 ? ' servicio' : ' servicios') + ' de ' + NOMBRES_FILTRO[filtro] + '.'; }
      }
    }

    botonesFiltro.forEach(function (boton) {
      boton.addEventListener('click', function () {
        if (boton.getAttribute('aria-pressed') === 'true') { return; }   // ya está elegido
        aplicarFiltro(boton.dataset.filtro);
      });
    });
  }

  /* ---------- 4) Botones de información: Nail art y adicionales / Press On ----------
     Computadora: el cuadro aparece al dejar el mouse encima y se va al sacarlo.
     Si se hace clic, queda fijo hasta volver a tocar el botón, tocar afuera o apretar Escape.
     Celular: se abre y se cierra tocando el botón. */
  const filaInfo = document.getElementById('info-fila');
  if (filaInfo) {
    const botonesInfo = filaInfo.querySelectorAll('.info-boton');
    const hayMouse = window.matchMedia('(hover: hover)').matches;
    let abierto = null;       // el botón cuyo cuadro está abierto ahora
    let fijado = false;       // true si se abrió con un clic o un toque (no se cierra solo)
    let temporizador = null;

    function panelDe(boton) { return document.getElementById(boton.getAttribute('aria-controls')); }

    function cerrarInfo() {
      clearTimeout(temporizador);
      if (!abierto) { return; }
      panelDe(abierto).hidden = true;
      abierto.setAttribute('aria-expanded', 'false');
      abierto = null;
      fijado = false;
    }

    // El cuadro aparece debajo de los botones; si abajo no hay lugar en la pantalla pero arriba sí, aparece arriba
    function colocarPanel(boton) {
      const panel = panelDe(boton);
      panel.classList.remove('hacia-arriba');
      const fila = filaInfo.getBoundingClientRect();
      const alto = panel.offsetHeight + 16;
      const lugarAbajo = window.innerHeight - fila.bottom;
      const lugarArriba = fila.top - 90;               // 90 px: lo que ocupa la cabecera fija
      if (lugarAbajo < alto && lugarArriba > lugarAbajo) { panel.classList.add('hacia-arriba'); }
    }

    function abrirInfo(boton) {
      clearTimeout(temporizador);
      if (abierto === boton) { return; }
      cerrarInfo();                                   // si había otro abierto, se cierra
      panelDe(boton).hidden = false;
      colocarPanel(boton);
      boton.setAttribute('aria-expanded', 'true');
      abierto = boton;
    }

    // En computadora se espera un instante antes de cerrar, para poder llegar con el mouse hasta el cuadro
    function cerrarConDemora() {
      clearTimeout(temporizador);
      temporizador = setTimeout(function () { if (!fijado) { cerrarInfo(); } }, 250);
    }

    botonesInfo.forEach(function (boton) {
      const panel = panelDe(boton);

      boton.addEventListener('click', function () {
        if (abierto === boton && fijado) {            // ya estaba fijo: se cierra
          cerrarInfo();
        } else {                                      // se abre (o, si estaba abierto por el mouse, se fija)
          abrirInfo(boton);
          fijado = true;
          panel.scrollIntoView({ block: 'nearest', behavior: reducirMovimiento ? 'auto' : 'smooth' });
        }
      });

      if (hayMouse) {
        boton.addEventListener('mouseenter', function () { abrirInfo(boton); });
        boton.addEventListener('mouseleave', function () { if (!fijado) { cerrarConDemora(); } });
        panel.addEventListener('mouseenter', function () { clearTimeout(temporizador); });
        panel.addEventListener('mouseleave', function () { if (!fijado) { cerrarConDemora(); } });
      }
    });

    // Tocar afuera cierra el cuadro
    document.addEventListener('pointerdown', function (evento) {
      if (abierto && !filaInfo.contains(evento.target)) { cerrarInfo(); }
    });

    // Escape lo cierra y devuelve el foco al botón
    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && abierto) {
        const boton = abierto;
        cerrarInfo();
        boton.focus();
      }
    });
  }
})();