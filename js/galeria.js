/* ==========================================================
   Luxxu Studio - galeria.js
   Galería asimétrica de "Trabajos": hace aparecer cada foto con un fade-up al bajar.
   Las fotos de la mitad izquierda entran desde la izquierda y las de la mitad derecha,
   desde la derecha (eso se define en css/secciones.css, junto con el tamaño y el lugar de cada foto).

   Si este archivo no carga, las fotos se ven igual, simplemente sin animación.
   ========================================================== */
(function () {
  'use strict';

  const contenedor = document.getElementById('galeria-trabajos');
  if (!contenedor) { return; }

  // Si la persona pidió "reducir movimiento" en su celular o compu, las fotos quedan siempre visibles
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

  const fotos = Array.from(contenedor.querySelectorAll('.foto'));
  if (!fotos.length) { return; }

  let pendientes = fotos.slice();
  fotos.forEach(function (foto) { foto.classList.add('revelar'); });

  // Se revisa la posición de cada foto cuando se hace scroll o cambia el tamaño de la pantalla.
  // Aparece cuando asoma por abajo; las que ya quedaron arriba de la pantalla (por ejemplo, si se saltó
  // de golpe más abajo) también aparecen, así ninguna foto se queda escondida.
  function revelarVisibles() {
    const limite = window.innerHeight * 0.92;
    pendientes = pendientes.filter(function (foto) {
      if (foto.getBoundingClientRect().top < limite) {
        foto.classList.add('visible');
        return false;                                  // ya apareció: no se vuelve a esconder
      }
      return true;
    });
  }

  let esperando = false;
  function alMoverse() {
    if (esperando) { return; }
    esperando = true;
    window.requestAnimationFrame(function () { esperando = false; revelarVisibles(); });
  }

  window.addEventListener('scroll', alMoverse, { passive: true });
  window.addEventListener('resize', alMoverse);
  window.addEventListener('load', revelarVisibles);
  revelarVisibles();
})();