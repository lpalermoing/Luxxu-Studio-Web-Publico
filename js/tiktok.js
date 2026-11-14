/* ==========================================================
   Luxxu Studio - tiktok.js
   Sección "Luxxu Studio en movimiento" (videos de TikTok dentro de Trabajos).

   VISTA PREVIA (clip corto y sin sonido, alojado en la propia página)
   - Computadora: al pasar el mouse por un video (o enfocarlo con el teclado) se ve la vista previa unos segundos
     y después vuelve a la portada.
   - Celular: como no hay mouse, la vista previa arranca sola cuando el video queda a la vista (como máximo 2 a la vez).
   - No se muestra si la persona pidió "reducir movimiento" o activó el ahorro de datos.
   - Si no existe el archivo de la vista previa, simplemente se ve la portada.

   REPRODUCTOR (el video completo, con su sonido)
   - Al tocar el video se carga el reproductor oficial de TikTok dentro de la tarjeta. Antes de eso no se conecta nada con TikTok.
   - El número del video se toma del enlace (tiktok.com/@usuario/video/NÚMERO).
   - Si el enlace no tiene ese número, o el reproductor falla, se abre el video en TikTok.
   - Con Ctrl, Mayús o clic del medio también se abre directamente en TikTok.

   Reproductor oficial: https://developers.tiktok.com/doc/embed-player
   Dirección del reproductor: https://www.tiktok.com/player/v1/NÚMERO_DEL_VIDEO
   ========================================================== */
(function () {
  'use strict';

  const lista = document.getElementById('pista-videos');
  if (!lista) { return; }

  const carrusel = lista.closest('.carrusel');
  const cajas = Array.from(lista.querySelectorAll(':scope > li'));

  // Sin videos cargados todavía: se esconde el carrusel
  if (!cajas.length) {
    if (carrusel) { carrusel.hidden = true; }
    return;
  }

  const ORIGEN_TIKTOK = 'https://www.tiktok.com';
  const SEGUNDOS_DE_VISTA_PREVIA = 6;       // la vista previa se corta a los 6 segundos
  const MAXIMO_A_LA_VEZ = 2;                // en celular, cuántas vistas previas pueden verse al mismo tiempo

  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ahorroDeDatos = !!(navigator.connection && navigator.connection.saveData);
  const hayMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let abierta = null;                       // la casilla (li) que tiene el reproductor abierto ahora
  const conVistaPrevia = new Set();         // los videos que están mostrando su vista previa ahora

  /* ---------- Portada: si falta la imagen, se ve un recuadro bordó con el texto ---------- */
  cajas.forEach(function (caja) {
    const enlace = caja.querySelector('.video');
    if (!enlace) { return; }
    const imagen = enlace.querySelector('img');
    function sinPortada() { enlace.classList.add('sin-portada'); }
    if (!imagen) { sinPortada(); return; }
    imagen.addEventListener('error', sinPortada);
    if (imagen.complete && imagen.naturalWidth === 0) { sinPortada(); }
  });

  /* ---------- Vista previa ---------- */
  function videoDePrevia(enlace) {
    if (enlace._previa !== undefined) { return enlace._previa; }
    const ruta = enlace.dataset.previa;
    if (!ruta) { enlace._previa = null; return null; }

    const video = document.createElement('video');
    video.className = 'video-previa';
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.tabIndex = -1;
    video.disablePictureInPicture = true;
    video.preload = 'auto';
    video.src = ruta;

    video.addEventListener('playing', function () { enlace.classList.add('previa-activa'); });
    video.addEventListener('timeupdate', function () {
      if (video.currentTime >= SEGUNDOS_DE_VISTA_PREVIA) { detener(enlace); }
    });
    video.addEventListener('ended', function () { detener(enlace); });
    video.addEventListener('error', function () {      // el archivo no existe o no se puede reproducir: se queda la portada
      enlace._previa = null;
      conVistaPrevia.delete(enlace);
      enlace.classList.remove('previa-activa');
      video.remove();
    });

    enlace.appendChild(video);
    enlace._previa = video;
    return video;
  }

  function iniciar(enlace) {
    if (reducirMovimiento || ahorroDeDatos) { return; }
    if (conVistaPrevia.has(enlace) || conVistaPrevia.size >= MAXIMO_A_LA_VEZ) { return; }
    const caja = enlace.closest('li');
    if (caja && caja.classList.contains('reproduciendo')) { return; }
    const video = videoDePrevia(enlace);
    if (!video) { return; }
    conVistaPrevia.add(enlace);
    try { video.currentTime = 0; } catch (error) { /* todavía no cargó: arranca desde el principio igual */ }
    const promesa = video.play();
    if (promesa && promesa.catch) { promesa.catch(function () { detener(enlace); }); }
  }

  function detener(enlace) {
    conVistaPrevia.delete(enlace);
    enlace.classList.remove('previa-activa');
    const video = enlace._previa;
    if (video) {
      video.pause();
      try { video.currentTime = 0; } catch (error) { /* sin problema */ }
    }
  }

  const enlaces = cajas.map(function (caja) { return caja.querySelector('.video'); }).filter(Boolean);

  if (hayMouse) {
    // Computadora: con el mouse (o con el teclado)
    enlaces.forEach(function (enlace) {
      enlace.addEventListener('mouseenter', function () { iniciar(enlace); });
      enlace.addEventListener('mouseleave', function () { detener(enlace); });
      enlace.addEventListener('focus', function () { iniciar(enlace); });
      enlace.addEventListener('blur', function () { detener(enlace); });
    });
  } else if ('IntersectionObserver' in window) {
    // Celular: arranca sola cuando el video queda bien a la vista y se corta cuando sale
    const observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) { iniciar(entrada.target); } else { detener(entrada.target); }
      });
    }, { threshold: 0.6 });
    enlaces.forEach(function (enlace) { observador.observe(enlace); });
  }

  /* ---------- Reproductor oficial al tocar ---------- */
  function numeroDeVideo(enlace) {
    const coincidencia = /\/video\/(\d{8,})/.exec(enlace.getAttribute('href') || '');
    return coincidencia ? coincidencia[1] : null;
  }

  // Vuelve la casilla a su portada
  function cerrar(caja) {
    if (!caja) { return; }
    const enlace = caja.querySelector('.video');
    caja.querySelectorAll('iframe, .video-cerrar, .video-aviso').forEach(function (el) { el.remove(); });
    if (enlace) { enlace.hidden = false; }
    caja.classList.remove('reproduciendo');
    if (abierta === caja) { abierta = null; }
  }

  // Si el reproductor no puede mostrar el video, se ofrece abrirlo en TikTok
  function mostrarAviso(caja, enlace) {
    caja.querySelectorAll('iframe').forEach(function (el) { el.remove(); });
    if (caja.querySelector('.video-aviso')) { return; }
    const aviso = document.createElement('a');
    aviso.className = 'video-aviso';
    aviso.href = enlace.href;
    aviso.target = '_blank';
    aviso.rel = 'noopener';
    aviso.textContent = 'No se pudo reproducir acá. Ver en TikTok';
    caja.appendChild(aviso);
  }

  function reproducir(caja, enlace, numero) {
    cerrar(abierta);                                   // solo un video a la vez
    detener(enlace);                                   // se corta su vista previa

    const nombre = enlace.getAttribute('aria-label') || 'Video de TikTok';
    const marco = document.createElement('iframe');
    marco.src = ORIGEN_TIKTOK + '/player/v1/' + numero + '?autoplay=1&rel=0';
    marco.title = nombre;
    marco.allow = 'autoplay; fullscreen';
    marco.setAttribute('allowfullscreen', '');

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'video-cerrar';
    boton.setAttribute('aria-label', 'Cerrar el video');
    boton.textContent = '×';
    boton.addEventListener('click', function () { cerrar(caja); enlace.focus(); });

    enlace.hidden = true;
    caja.classList.add('reproduciendo');
    caja.appendChild(marco);
    caja.appendChild(boton);
    abierta = caja;

    // El reproductor avisa si algo falla (por ejemplo, si el video es privado o fue borrado)
    function alRecibir(evento) {
      if (evento.source !== marco.contentWindow) { return; }
      const datos = evento.data;
      if (datos && datos['x-tiktok-player'] && /error/i.test(String(datos.type))) {
        mostrarAviso(caja, enlace);
        window.removeEventListener('message', alRecibir);
      }
    }
    window.addEventListener('message', alRecibir);
  }

  lista.addEventListener('click', function (evento) {
    const enlace = evento.target.closest('a.video');
    if (!enlace) { return; }
    // Ctrl, Mayús, Cmd o clic del medio: se deja abrir el enlace de forma normal (en TikTok)
    if (evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) { return; }
    const numero = numeroDeVideo(enlace);
    if (!numero) { return; }                           // sin número: se abre TikTok normalmente
    evento.preventDefault();
    reproducir(enlace.closest('li'), enlace, numero);
  });

  // Escape cierra el video abierto
  document.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape' && abierta) {
      const caja = abierta;
      cerrar(caja);
      const enlace = caja.querySelector('.video');
      if (enlace) { enlace.focus(); }
    }
  });
})();