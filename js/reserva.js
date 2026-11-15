/* ==========================================================
   Luxxu Studio - reserva.js
   Arma el turno de la clienta: suma los servicios elegidos,
   pregunta si necesita retiro de uñas, deja elegir día y horario en un
   calendario y prepara el mensaje de WhatsApp.

   Importante: la web NO envía nada sola ni guarda datos.
   La clienta toca el botón y se abre el chat de WhatsApp de Luxxu Studio
   con el mensaje ya escrito; lo envía ella. El enlace de WhatsApp lleva
   directo al chat del estudio, pero solo puede llevar texto: las fotos del
   diseño las adjunta la clienta desde el chat.

   Los servicios son tarjetas (.tarjeta[data-servicio]).
   Cada tarjeta tiene un botón redondo: "+" para agregar al turno y,
   una vez agregado, "−" para quitarlo. En Esculpidas Poligel, al
   agregarlo aparece además el control de largo (− y +).

   Retiro de uñas y aviso de las fotos del diseño: solo aparecen si el turno
   incluye algún servicio de uñas (las tarjetas con data-retiro="si").

   Las tarjetas de cursos no tienen data-servicio: no se suman al turno,
   tienen su propio botón "Consultar" que abre WhatsApp.

   Disponibilidad: el calendario muestra los horarios habituales.
   Todavía no sabe qué horarios están ocupados (eso necesita un servidor).
   ========================================================== */
(function () {
  'use strict';

  /* ---------- Datos del estudio (se cambian acá) ---------- */
  const WHATSAPP = '5491157318157';
  const DIAS_A_MOSTRAR = 30;   // cuántos días hacia adelante se pueden elegir en el calendario
  const PRECIO_RETIRO = 5000;  // retiro de uñas (se suma solo si la clienta responde que sí)

  // Horarios habituales por día de la semana (0 = domingo: sin turnos)
  const HORARIOS = {
    1: ['09:00', '14:30', '18:30'],   // lunes
    2: ['09:00', '16:30', '18:00'],   // martes
    3: ['09:30', '16:30', '19:30'],   // miércoles
    4: ['09:00', '15:30', '18:00'],   // jueves
    5: ['09:00', '12:00', '14:00'],   // viernes
    6: ['09:00', '14:00', '16:15']    // sábado
  };
  const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                       'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* ---------- Elementos de la página ---------- */
  const filas = document.querySelectorAll('.tarjeta[data-servicio]');
  const barra = document.getElementById('barra-turno');
  const barraCantidad = document.getElementById('barra-cantidad');
  const barraTotal = document.getElementById('barra-total');
  const botonAbrir = document.getElementById('abrir-turno');
  const dialogo = document.getElementById('turno');
  const botonCerrar = document.getElementById('cerrar-turno');
  const lista = document.getElementById('turno-lista');
  const cajaRetiro = document.getElementById('turno-retiro');   // la pregunta del retiro de uñas
  const totalDialogo = document.getElementById('turno-total');
  const calTitulo = document.getElementById('cal-titulo');
  const calAnterior = document.getElementById('cal-anterior');
  const calSiguiente = document.getElementById('cal-siguiente');
  const calDias = document.getElementById('cal-dias');
  const cajaHoras = document.getElementById('turno-horas');
  const campoNombre = document.getElementById('turno-nombre');
  const vista = document.getElementById('turno-vista');
  const aviso = document.getElementById('turno-aviso');
  const enlace = document.getElementById('turno-enviar');
  const botonVaciar = document.getElementById('vaciar-turno');   // la "X" de la barra inferior
  const notaFinal = document.getElementById('turno-nota-final');   // aviso de las fotos, debajo del botón de WhatsApp

  // Si falta algo en el HTML, no hacemos nada (así la página no se rompe)
  if (!filas.length || !barra || !dialogo || !calDias || !cajaHoras || !enlace) { return; }

  /* ---------- Estado ---------- */
  const servicios = [];   // todos los servicios de las tarjetas
  const elegidos = [];    // los que la clienta fue sumando
  let dias = {};          // días elegibles: { '2026-11-02': Date }
  let diaElegido = '';    // clave del día elegido en el calendario
  let horaElegida = '';
  let mesVisible = null;  // primer día del mes que muestra el calendario
  let primerMes = null;   // primer mes que se puede ver (el actual)
  let ultimoMes = null;   // último mes que se puede ver
  let retiro = '';        // respuesta sobre el retiro de uñas: '' (sin responder), 'si' o 'no'

  /* ---------- Herramientas ---------- */
  function leerPrecio(texto) { return parseInt(texto.replace(/[^\d]/g, ''), 10) || 0; }

  function dinero(numero) { return '$' + String(numero).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  function dosDigitos(numero) { return (numero < 10 ? '0' : '') + numero; }

  function precioDe(s) { return s.base + (s.largo - 1) * s.paso; }

  function nombreDe(s) { return s.maxLargo > 1 ? s.nombre + ' (largo ' + s.largo + ')' : s.nombre; }

  // Total de los servicios elegidos (es el que se ve en la barra de abajo)
  function totalActual() {
    return elegidos.reduce(function (suma, s) { return suma + precioDe(s); }, 0);
  }

  // ¿Hay algún servicio de uñas en el turno?
  function hayUnas() {
    return elegidos.some(function (s) { return s.fila.dataset.retiro === 'si'; });
  }

  // ¿Hay que preguntar por el retiro de uñas?
  function pideRetiro() { return !!cajaRetiro && hayUnas(); }

  function retiroAgregado() { return pideRetiro() && retiro === 'si'; }

  // Total de la ventana "Tu turno": servicios + retiro (si lo pidió)
  function totalConRetiro() { return totalActual() + (retiroAgregado() ? PRECIO_RETIRO : 0); }

  function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) { el.className = clase; }
    if (texto !== undefined) { el.textContent = texto; }
    return el;
  }

  /* ---------- Botón + / − y largo en cada tarjeta ---------- */
  filas.forEach(function (fila) {
    const precioEl = fila.querySelector('.precio');
    const s = {
      fila: fila,
      precioEl: precioEl,
      nombre: fila.dataset.servicio,
      base: leerPrecio(precioEl.textContent),
      maxLargo: Number(fila.dataset.largos) || 1,   // hasta qué largo se puede elegir
      paso: Number(fila.dataset.paso) || 0,         // cuánto suma cada largo
      largo: 1
    };

    // Botón redondo: "+" agrega al turno; cuando ya está agregado pasa a "−" y lo quita
    s.boton = crear('button', 'agregar', '+');
    s.boton.type = 'button';
    s.boton.setAttribute('aria-label', 'Agregar ' + s.nombre + ' al turno');
    s.boton.addEventListener('click', function () { alternar(s); });
    (fila.querySelector('.tarjeta-control') || fila).appendChild(s.boton);

    // Control de largo: solo existe en los servicios con largos (Poligel) y aparece recién al agregarlos
    if (s.maxLargo > 1) {
      s.cajaLargo = crear('div', 'largo');
      s.cajaLargo.hidden = true;
      s.menos = crear('button', '', '−');
      s.menos.type = 'button';
      s.menos.setAttribute('aria-label', 'Largo más corto');
      s.mas = crear('button', '', '+');
      s.mas.type = 'button';
      s.mas.setAttribute('aria-label', 'Largo más largo');
      s.valorLargo = crear('output', '', '1');
      s.cajaLargo.appendChild(crear('span', '', 'Largo'));
      s.cajaLargo.appendChild(s.menos);
      s.cajaLargo.appendChild(s.valorLargo);
      s.cajaLargo.appendChild(s.mas);
      s.menos.addEventListener('click', function () { cambiarLargo(s, -1); });
      s.mas.addEventListener('click', function () { cambiarLargo(s, 1); });
      (fila.querySelector('.tarjeta-extra') || fila).appendChild(s.cajaLargo);
    }

    servicios.push(s);
  });

  function alternar(s) {
    const posicion = elegidos.indexOf(s);
    if (posicion === -1) {
      elegidos.push(s);
    } else {
      elegidos.splice(posicion, 1);
      s.largo = 1;
    }
    actualizarTodo();
  }

  function cambiarLargo(s, cambio) {
    s.largo = Math.min(s.maxLargo, Math.max(1, s.largo + cambio));
    actualizarTodo();
  }

  /* ---------- Refrescar lo que se ve ---------- */
  function actualizarFila(s) {
    const elegido = elegidos.indexOf(s) !== -1;
    s.fila.classList.toggle('elegido', elegido);
    s.boton.textContent = elegido ? '−' : '+';
    s.boton.setAttribute('aria-label', (elegido ? 'Quitar ' + s.nombre + ' del turno' : 'Agregar ' + s.nombre + ' al turno'));
    s.precioEl.textContent = dinero(precioDe(s));
    if (s.cajaLargo) {
      s.cajaLargo.hidden = !elegido;
      s.valorLargo.textContent = s.largo;
      s.menos.disabled = s.largo <= 1;
      s.mas.disabled = s.largo >= s.maxLargo;
    }
  }

  function actualizarTodo() {
    servicios.forEach(actualizarFila);
    barra.hidden = elegidos.length === 0;
    document.body.classList.toggle('con-barra', elegidos.length > 0);
    barraCantidad.textContent = elegidos.length + (elegidos.length === 1 ? ' servicio' : ' servicios');
    barraTotal.textContent = dinero(totalActual());

    if (dialogo.hasAttribute('open')) {
      if (elegidos.length === 0) { cerrar(); } else { dibujarVentana(); }
    }
  }

  function dibujarVentana() {
    // La pregunta del retiro solo aparece si hay servicios de uñas; si no, se borra la respuesta
    if (cajaRetiro) {
      const pregunta = pideRetiro();
      cajaRetiro.hidden = !pregunta;
      if (!pregunta) {
        retiro = '';
        cajaRetiro.querySelectorAll('input').forEach(function (radio) { radio.checked = false; });
      }
    }

    lista.replaceChildren();
    elegidos.forEach(function (s) {
      const li = crear('li');
      const quitar = crear('button', 'quitar', 'Quitar');
      quitar.type = 'button';
      quitar.setAttribute('aria-label', 'Quitar ' + s.nombre);
      quitar.addEventListener('click', function () { alternar(s); });
      li.appendChild(crear('span', 'detalle', nombreDe(s)));
      li.appendChild(crear('span', 'monto', dinero(precioDe(s))));
      li.appendChild(quitar);
      lista.appendChild(li);
    });
    if (retiroAgregado()) {      // el retiro se ve como una línea más, sin botón "Quitar" (se cambia en la pregunta)
      const li = crear('li');
      li.appendChild(crear('span', 'detalle', 'Retiro de uñas'));
      li.appendChild(crear('span', 'monto', dinero(PRECIO_RETIRO)));
      lista.appendChild(li);
    }
    totalDialogo.textContent = dinero(totalConRetiro());
    actualizarEnlace();
  }

  /* ---------- Calendario y horarios ---------- */
  function inicioDelDia(fecha) { return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()); }

  function claveDelDia(dia) { return dia.getFullYear() + '-' + dosDigitos(dia.getMonth() + 1) + '-' + dosDigitos(dia.getDate()); }

  function textoDelDia(dia) {
    const texto = NOMBRES_DIA[dia.getDay()] + ' ' + dia.getDate() + ' de ' + NOMBRES_MES[dia.getMonth()];
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function textoDelMes(fecha) {
    const texto = NOMBRES_MES[fecha.getMonth()] + ' ' + fecha.getFullYear();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  // Horarios de ese día que todavía no pasaron
  function horasDisponibles(dia, ahora) {
    const horas = HORARIOS[dia.getDay()] || [];
    if (dia.getTime() !== inicioDelDia(ahora).getTime()) { return horas; }
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    return horas.filter(function (hora) {
      const partes = hora.split(':');
      return Number(partes[0]) * 60 + Number(partes[1]) > minutosAhora;
    });
  }

  function armarDias() {
    const ahora = new Date();
    const hoy = inicioDelDia(ahora);
    let primero = null;
    dias = {};
    for (let i = 0; i < DIAS_A_MOSTRAR; i++) {
      const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
      if (horasDisponibles(dia, ahora).length === 0) { continue; } // domingos o días sin horarios
      dias[claveDelDia(dia)] = dia;
      if (!primero) { primero = dia; }
    }
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + DIAS_A_MOSTRAR - 1);
    primerMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    ultimoMes = new Date(ultimoDia.getFullYear(), ultimoDia.getMonth(), 1);
    if (!dias[diaElegido]) { diaElegido = ''; }
    const base = dias[diaElegido] || primero || hoy;
    mesVisible = new Date(base.getFullYear(), base.getMonth(), 1);
    dibujarCalendario();
    mostrarHoras();
  }

  function dibujarCalendario() {
    calTitulo.textContent = textoDelMes(mesVisible);
    calAnterior.disabled = mesVisible.getTime() <= primerMes.getTime();
    calSiguiente.disabled = mesVisible.getTime() >= ultimoMes.getTime();
    calDias.replaceChildren();

    const hoyClave = claveDelDia(new Date());
    const lugaresVacios = (mesVisible.getDay() + 6) % 7;   // la semana empieza en lunes
    for (let i = 0; i < lugaresVacios; i++) { calDias.appendChild(crear('span', 'cal-vacio')); }

    const cantidad = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
    for (let numero = 1; numero <= cantidad; numero++) {
      const dia = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), numero);
      const clave = claveDelDia(dia);
      const libre = !!dias[clave];
      const boton = crear('button', 'cal-dia', String(numero));
      boton.type = 'button';
      boton.dataset.dia = clave;
      boton.disabled = !libre;
      boton.setAttribute('aria-label', textoDelDia(dia) + (libre ? '' : ', sin turnos'));
      boton.setAttribute('aria-pressed', clave === diaElegido ? 'true' : 'false');
      if (clave === diaElegido) { boton.classList.add('cal-elegido'); }
      if (clave === hoyClave) { boton.classList.add('cal-hoy'); }
      calDias.appendChild(boton);
    }
  }

  function mostrarHoras() {
    cajaHoras.replaceChildren();
    const dia = dias[diaElegido];
    if (!dia) {
      horaElegida = '';
      cajaHoras.appendChild(crear('p', 'nota', 'Primero elegí un día en el calendario.'));
      return;
    }
    const horas = horasDisponibles(dia, new Date());
    if (horas.indexOf(horaElegida) === -1) { horaElegida = ''; }
    horas.forEach(function (hora) {
      const etiqueta = crear('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'hora';
      radio.value = hora;
      radio.checked = hora === horaElegida;
      etiqueta.appendChild(radio);
      etiqueta.appendChild(crear('span', '', hora));
      cajaHoras.appendChild(etiqueta);
    });
  }

  /* ---------- Mensaje de WhatsApp ---------- */
  function armarMensaje() {
    const nombre = campoNombre.value.trim();
    const lineas = [];
    lineas.push('Hola Luxxu Studio!' + (nombre ? ' Soy ' + nombre + '.' : ''));
    lineas.push('Quiero reservar un turno:');
    elegidos.forEach(function (s) { lineas.push('• ' + nombreDe(s) + ' - ' + dinero(precioDe(s))); });
    if (pideRetiro() && retiro === 'si') { lineas.push('• Retiro de uñas - ' + dinero(PRECIO_RETIRO)); }
    if (pideRetiro() && retiro === 'no') { lineas.push('Retiro de uñas: no necesito'); }
    lineas.push('Total estimado: ' + dinero(totalConRetiro()) + ' (a confirmar)');
    const dia = dias[diaElegido];
    if (dia && horaElegida) { lineas.push('Día y horario: ' + textoDelDia(dia) + ', ' + horaElegida + ' hs'); }
    return lineas.join('\n');
  }

  // Qué falta para poder enviar el turno (texto vacío = está todo)
  function queFalta() {
    if (elegidos.length === 0) { return 'Sumá al menos un servicio.'; }
    if (pideRetiro() && retiro === '') { return 'Contanos si necesitás retiro de uñas.'; }
    if (!dias[diaElegido]) { return 'Elegí un día en el calendario.'; }
    if (horaElegida === '') { return 'Elegí un horario.'; }
    return '';
  }

  function turnoCompleto() { return queFalta() === ''; }

  // Aviso que se ve debajo del botón: las fotos no viajan en el enlace, la clienta las manda desde el chat
  function textoNotaFinal() {
    if (!hayUnas()) { return ''; }
    return 'Si querés nail art o un diseño, cuando se abra WhatsApp mandanos las fotos del diseño que más te guste y lo cotizamos.';
  }

  function actualizarEnlace() {
    const mensaje = armarMensaje();
    vista.textContent = mensaje;
    const listo = turnoCompleto();
    enlace.setAttribute('aria-disabled', listo ? 'false' : 'true');
    enlace.href = listo ? 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(mensaje) : '#';
    if (notaFinal) {
      const texto = textoNotaFinal();
      notaFinal.textContent = texto;
      notaFinal.hidden = texto === '';
    }
    if (listo) { aviso.textContent = ''; }
  }

  /* ---------- Abrir y cerrar la ventana ---------- */
  function abrir() {
    if (elegidos.length === 0) { return; }
    armarDias();
    dibujarVentana();
    aviso.textContent = '';
    if (typeof dialogo.showModal === 'function') { dialogo.showModal(); } else { dialogo.setAttribute('open', ''); }
  }

  function cerrar() {
    if (typeof dialogo.close === 'function') { dialogo.close(); } else { dialogo.removeAttribute('open'); }
  }

  botonAbrir.addEventListener('click', abrir);
  botonCerrar.addEventListener('click', cerrar);
  dialogo.addEventListener('click', function (evento) { if (evento.target === dialogo) { cerrar(); } }); // clic en el fondo oscuro

  // Calendario: cambiar de mes y elegir día
  calAnterior.addEventListener('click', function () {
    mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1);
    dibujarCalendario();
  });
  calSiguiente.addEventListener('click', function () {
    mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1);
    dibujarCalendario();
  });
  calDias.addEventListener('click', function (evento) {
    const boton = evento.target.closest('.cal-dia');
    if (!boton || boton.disabled) { return; }
    diaElegido = boton.dataset.dia;
    dibujarCalendario();
    mostrarHoras();
    actualizarEnlace();
    const nuevo = calDias.querySelector('[data-dia="' + diaElegido + '"]');
    if (nuevo) { nuevo.focus(); }   // el teclado no pierde el lugar al redibujar
  });

  cajaHoras.addEventListener('change', function (evento) { horaElegida = evento.target.value; actualizarEnlace(); });
  if (cajaRetiro) {
    cajaRetiro.addEventListener('change', function (evento) { retiro = evento.target.value; dibujarVentana(); });
  }
  campoNombre.addEventListener('input', actualizarEnlace);

  // Botón de enviar: abre directo el chat de WhatsApp de Luxxu Studio con el mensaje escrito
  enlace.addEventListener('click', function (evento) {
    if (enlace.getAttribute('aria-disabled') === 'true') {
      evento.preventDefault();
      aviso.textContent = queFalta();
    }
  });

  // "X" de la barra inferior: borra todo el turno (servicios, retiro, día y horario) y oculta la barra
  function vaciarTurno() {
    elegidos.forEach(function (s) { s.largo = 1; });
    elegidos.length = 0;
    retiro = '';
    if (cajaRetiro) { cajaRetiro.querySelectorAll('input').forEach(function (radio) { radio.checked = false; }); }
    diaElegido = '';
    horaElegida = '';
    actualizarTodo();
  }
  if (botonVaciar) { botonVaciar.addEventListener('click', vaciarTurno); }

  actualizarTodo();
})();