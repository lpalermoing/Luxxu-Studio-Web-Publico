// Cabecera: transparente sobre la portada (se vuelve bordó al bajar), marca la sección actual
// y abre/cierra el menú de tres rayitas en el celular.
const cabecera = document.getElementById('cabecera');
const portada = document.getElementById('inicio');

/* 1) Transparente sobre la portada, bordó al salir de ella */
if (cabecera && portada && 'IntersectionObserver' in window) {
  // Avisa cuándo la portada entra o sale de la pantalla (con 90 px de margen arriba)
  new IntersectionObserver(([entrada]) => {
    cabecera.classList.toggle('sobre-hero', entrada.isIntersecting);
  }, { rootMargin: '-90px 0px 0px 0px' }).observe(portada);
} else if (cabecera) {
  // Si el navegador no soporta el observador, dejamos la cabecera bordó siempre
  cabecera.classList.remove('sobre-hero');
}

/* 2) Marca en el menú la sección en la que estás (color dorado + barrita) */
const enlaces = Array.from(document.querySelectorAll('.menu a[href^="#"]'));
const secciones = enlaces.map((enlace) => document.querySelector(enlace.getAttribute('href')));

function marcarSeccionActual() {
  // Línea imaginaria al 35 % de la altura de la pantalla: la última sección que ya la cruzó es la actual
  const linea = window.scrollY + window.innerHeight * 0.35;
  let actual = 0;
  secciones.forEach((seccion, i) => {
    if (seccion && seccion.getBoundingClientRect().top + window.scrollY <= linea) { actual = i; }
  });
  // Si llegaste al final de la página, la última sección queda marcada
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
    actual = secciones.length - 1;
  }
  enlaces.forEach((enlace, i) => {
    if (i === actual) { enlace.setAttribute('aria-current', 'location'); }
    else { enlace.removeAttribute('aria-current'); }
  });
}

let esperando = false;
function alMoverse() {
  if (esperando) { return; }
  esperando = true;
  window.requestAnimationFrame(() => { marcarSeccionActual(); esperando = false; });
}

if (enlaces.length) {
  window.addEventListener('scroll', alMoverse, { passive: true });
  window.addEventListener('resize', alMoverse);
  marcarSeccionActual();
}

/* 3) Menú de tres rayitas (solo se usa en el celular) */
const botonMenu = document.getElementById('boton-menu');

function cambiarMenu(abrir) {
  cabecera.classList.toggle('menu-abierto', abrir);
  botonMenu.setAttribute('aria-expanded', String(abrir));
  botonMenu.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
}

if (cabecera && botonMenu) {
  botonMenu.addEventListener('click', () => cambiarMenu(!cabecera.classList.contains('menu-abierto')));
  // Al tocar una sección, el menú se cierra
  enlaces.forEach((enlace) => enlace.addEventListener('click', () => cambiarMenu(false)));
  // Con la tecla Escape también se cierra
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && cabecera.classList.contains('menu-abierto')) {
      cambiarMenu(false);
      botonMenu.focus();
    }
  });
  // Si la ventana pasa a tamaño de computadora, el menú vuelve a su estado normal
  window.matchMedia('(min-width: 48rem)').addEventListener('change', (evento) => {
    if (evento.matches) { cambiarMenu(false); }
  });
}