/* ==========================================================
   Luxxu Studio - tiktok.js
   Sección "Luxxu Studio en movimiento": videos propios que se reproducen dentro de la página.

   - Computadora: al pasar el mouse, el video arranca SIN sonido; si el mouse se va, se pausa.
     Un clic lo deja reproduciéndose CON sonido; otro clic lo pausa.
   - Celular: se toca el video para reproducirlo (con sonido) y se vuelve a tocar para pausarlo.
   - El botón del parlante activa o silencia el sonido.
   - Solo suena un video a la vez. Se pausan solos al salir de pantalla, al cambiar de pestaña o con Escape.
   - Con "reducir movimiento" o ahorro de datos no hay reproducción al pasar el mouse (solo al tocar o hacer clic).
   - Computadora: no se ve el ícono de play (el video arranca solo al pasar el mouse). Celular: sí se ve el play.
   - Los videos no se descargan hasta que alguien los usa (preload="none" en el HTML).
   - Solo el botón "Seguinos en TikTok" lleva a TikTok.
   ========================================================== */
(function () {
  'use strict';

  const lista = document.getElementById('pista-videos');
  if (!lista) { return; }

  const cajas = Array.from(lista.querySelectorAll(':scope > li'));
  if (!cajas.length) {                                   // sin videos cargados: se esconde el carrusel
    const carrusel = lista.closest('.carrusel');
    if (carrusel) { carrusel.hidden = true; }
    return;
  }

  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ahorroDeDatos = !!(navigator.connection && navigator.connection.saveData);
  const hayMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const conVistaPrevia = hayMouse && !reducirMovimiento && !ahorroDeDatos;

  // Cuando el video arranca al pasar el mouse, el CSS esconde el ícono de play (ver ".con-vista-previa" en secciones.css)
  if (conVistaPrevia) { lista.classList.add('con-vista-previa'); }

  let actual = null;                                     // el video que está en marcha ahora

  /* Cada video tiene tres modos: 'quieto', 'previa' (mouse, sin sonido) o 'persona' (lo puso a andar quien visita la página) */

  function refrescar(t) {
    const andando = !t.video.paused && !t.video.ended;
    t.clip.classList.toggle('reproduciendo', andando);
    t.clip.classList.toggle('con-sonido', !t.video.muted);
    t.play.setAttribute('aria-label', (andando ? 'Pausar: ' : 'Reproducir: ') + t.nombre);
    t.sonido.setAttribute('aria-label', (t.video.muted ? 'Activar el sonido de: ' : 'Silenciar: ') + t.nombre);
  }

  function pausar(t) {
    t.modo = 'quieto';
    t.clip.classList.remove('cargando');
    t.video.pause();
    if (actual === t) { actual = null; }
  }

  function iniciar(t, conSonido) {
    if (actual && actual !== t) { pausar(actual); }      // solo un video a la vez
    actual = t;
    t.video.muted = !conSonido;
    t.video.loop = (t.modo === 'previa');                // en la vista previa se repite; al ver completo, no
    t.clip.classList.add('cargando');
    const promesa = t.video.play();
    if (promesa && promesa.catch) {
      promesa.catch(function (error) {
        if (conSonido && error && error.name === 'NotAllowedError') {
          t.video.muted = true;                          // el navegador no dejó con sonido: se prueba sin sonido
          t.video.play().catch(function () { t.clip.classList.remove('cargando'); });
        } else {
          t.clip.classList.remove('cargando');           // (un AbortError es normal si se pausa mientras carga)
        }
      });
    }
  }

  function volverAlInicio(t) {                           // el video terminó: vuelve la portada
    t.modo = 'quieto';
    if (actual === t) { actual = null; }
    t.video.currentTime = 0;
    t.clip.classList.remove('activo', 'cargando');
    t.clip.style.setProperty('--avance', 0);
    refrescar(t);
  }

  function fallo(t) {                                    // el archivo no existe o no se puede reproducir
    console.warn('Luxxu Studio: no se pudo cargar el video ' + (t.video.currentSrc || t.video.getAttribute('src')) + ' (revisá que el nombre del archivo sea igual al del HTML)');
    t.modo = 'quieto';
    if (actual === t) { actual = null; }
    t.clip.classList.remove('activo', 'cargando');
    t.clip.classList.add('con-error');
    t.play.disabled = true;
    if (!t.clip.querySelector('.clip-aviso')) {
      const aviso = document.createElement('p');
      aviso.className = 'clip-aviso';
      aviso.setAttribute('role', 'status');
      aviso.textContent = 'No se pudo cargar el video';
      t.clip.appendChild(aviso);
    }
  }

  function armar(caja) {
    const clip = caja.querySelector('.clip');
    if (!clip) { return null; }
    const t = {
      clip: clip,
      video: clip.querySelector('.clip-video'),
      portada: clip.querySelector('.clip-portada'),
      play: clip.querySelector('.clip-play'),
      sonido: clip.querySelector('.clip-sonido'),
      nombre: clip.dataset.nombre || 'video',
      modo: 'quieto',
      temporizador: null
    };
    if (!t.video || !t.play || !t.sonido) { return null; }

    // Portada: si falta la imagen se ve un recuadro bordó con el texto
    const sinPortada = function () { clip.classList.add('sin-portada'); };
    if (!t.portada) { sinPortada(); }
    else {
      t.portada.addEventListener('error', sinPortada);
      if (t.portada.complete && t.portada.naturalWidth === 0) { sinPortada(); }
    }

    // Lo que le pasa al video
    t.video.addEventListener('playing', function () { clip.classList.add('activo'); clip.classList.remove('cargando'); refrescar(t); });
    t.video.addEventListener('pause', function () { refrescar(t); });
    t.video.addEventListener('volumechange', function () { refrescar(t); });
    t.video.addEventListener('waiting', function () { clip.classList.add('cargando'); });
    t.video.addEventListener('timeupdate', function () {
      if (t.video.duration) { clip.style.setProperty('--avance', (t.video.currentTime / t.video.duration).toFixed(3)); }
    });
    t.video.addEventListener('ended', function () { volverAlInicio(t); });
    t.video.addEventListener('error', function () { fallo(t); });

    // Toque o clic (también Enter o Espacio con el teclado): reproduce con sonido o pausa
    t.play.addEventListener('click', function () {
      clip.classList.add('mostrar-icono');               // el ícono se ve un instante para confirmar la acción
      clearTimeout(t.temporizador);
      t.temporizador = setTimeout(function () { clip.classList.remove('mostrar-icono'); }, 1200);
      if (t.modo === 'persona' && !t.video.paused) { pausar(t); return; }
      t.modo = 'persona';
      iniciar(t, true);
    });

    // Botón del parlante
    t.sonido.addEventListener('click', function () {
      t.video.muted = !t.video.muted;
      if (!t.video.muted && t.modo === 'previa') { t.modo = 'persona'; t.video.loop = false; }
    });

    // Computadora: vista previa sin sonido al pasar el mouse
    if (conVistaPrevia) {
      clip.addEventListener('mouseenter', function () {
        if (t.modo !== 'quieto' || clip.classList.contains('con-error')) { return; }
        if (actual && actual.modo === 'persona') { return; }   // ya hay un video puesto a andar por la persona
        t.modo = 'previa';
        iniciar(t, false);
      });
      clip.addEventListener('mouseleave', function () { if (t.modo === 'previa') { pausar(t); } });
    }

    refrescar(t);
    return t;
  }

  const tarjetas = cajas.map(armar).filter(Boolean);

  // Se pausa al salir de pantalla (por ejemplo, al deslizar el carrusel)
  if ('IntersectionObserver' in window) {
    const observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.intersectionRatio >= 0.2) { return; }
        tarjetas.forEach(function (t) { if (t.clip === entrada.target && !t.video.paused) { pausar(t); } });
      });
    }, { threshold: [0, 0.2] });
    tarjetas.forEach(function (t) { observador.observe(t.clip); });
  }

  // Escape pausa el video en marcha; al cambiar de pestaña también se pausa
  document.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape' && actual) { pausar(actual); }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && actual) { pausar(actual); }
  });
})();