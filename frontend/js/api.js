/* ===== VetConnect — conexión con la API REST de citas (/api/citas) =====
   Usa fetch, sin librerías. Se carga después de script.js.
   - Crear:      POST   /api/citas
   - Listar:     GET    /api/citas
   - Ver uno:    GET    /api/citas/:id
   - Actualizar: PUT    /api/citas/:id
   - Eliminar:   DELETE /api/citas/:id
*/
(function () {
  'use strict';

  /* Si se abre index.html directamente (file://) se apunta al servidor local; CORS está habilitado. */
  var API_URL = location.protocol === 'file:' ? 'http://localhost:3000/api/citas' : '/api/citas';
  var TIMEOUT_MS = 10000;

  var SERVICIOS = {
    'consulta-general': 'Consulta general',
    'vacunacion': 'Vacunación',
    'desparasitacion': 'Desparasitación',
    'consulta-preventiva': 'Consulta preventiva',
    'control': 'Control veterinario',
    'basica': 'Atención básica'
  };
  var ESTADOS = { programada: 'Programada', completada: 'Completada', cancelada: 'Cancelada' };
  var ESPECIES = { perro: 'Perro', gato: 'Gato', ave: 'Ave', otro: 'Otra' };
  var CANALES = { correo: 'Correo electrónico', telefono: 'Llamada telefónica', whatsapp: 'WhatsApp' };
  var RECORDATORIOS = { correo: 'Correo', sms: 'SMS' };
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /* campo devuelto por la API -> selector del control del formulario */
  var CAMPOS = {
    'propietario.nombre': '#nombre',
    'correo': '#correo',
    'telefono': '#telefono',
    'canal': '#canal',
    'mascota.nombre': '#mascota-nombre',
    'especie': '#especie',
    'raza': '#raza',
    'edad': '#edad',
    'sexo': 'input[name="sexo"]',
    'servicio': '#servicio',
    'fecha': '#fecha',
    'hora': '#hora',
    'recordatorios': 'input[name="recordatorio"]',
    'motivo': '#motivo',
    'observaciones': '#observaciones'
  };

  var form = document.getElementById('form-citas');
  var formMsg = document.getElementById('form-estado');
  var formModo = document.getElementById('form-modo');
  var listaMsg = document.getElementById('citas-estado');
  var tbody = document.querySelector('#expediente tbody');
  var dialogo = document.getElementById('cita-detalle');
  var botonEnviar = form.querySelector('button[type="submit"]');
  var textoBotonEnviar = botonEnviar.textContent;

  var editando = null; // { id, estado } cuando el formulario está en modo edición
  var enviando = false;

  /* ---------- Estilos mínimos para lo nuevo (usa las variables de style.css) ---------- */
  var estilo = document.createElement('style');
  estilo.textContent = [
    '.api-msg{grid-column:1/-1;margin:0 0 16px;padding:12px 16px;border-radius:12px;font-size:.92rem;border:1px solid var(--line);background:var(--paper);color:var(--ink);}',
    '.api-msg[hidden]{display:none;}',
    '.api-msg--ok{border-color:#9CC9B2;background:#E6EFE9;color:#2C5F45;}',
    '.api-msg--error{border-color:#E1B1B3;background:#F8E6E7;color:#8E3B40;}',
    '.api-msg--info{border-color:#B7D3E4;background:#E3EEF6;color:#2F5D7C;}',
    '.api-msg strong{display:block;margin-bottom:2px;}',
    '.api-msg ul{margin:6px 0 0;padding-left:1.2em;}',
    '.api-msg button{margin-left:10px;}',
    '.api-invalid{border-color:var(--clay) !important;}',
    '.api-btn{font:inherit;font-size:.8rem;font-weight:600;padding:5px 12px;border-radius:999px;cursor:pointer;background:transparent;color:var(--pine-dark);border:1.5px solid var(--pine-dark);}',
    '.api-btn:hover:not(:disabled){background:rgba(72,169,166,.12);}',
    '.api-btn:disabled{opacity:.55;cursor:wait;}',
    '.api-btn--peligro{color:var(--clay);border-color:var(--clay);}',
    '.api-btn--peligro:hover:not(:disabled){background:rgba(193,102,107,.12);}',
    '.api-acciones{display:flex;gap:6px;flex-wrap:wrap;}',
    '.badge.api-estado-programada{background:#E3EEF6;color:#2F5D7C;}',
    '.badge.api-estado-cancelada{background:#F8E6E7;color:#8E3B40;}',
    '.api-vacio{text-align:center;color:#6b6558;}',
    '.api-dialog{border:1px solid var(--line);border-radius:var(--radius,20px);padding:24px;width:min(520px,calc(100% - 32px));background:var(--paper);color:var(--ink);box-shadow:0 24px 50px rgba(20,40,38,.25);}',
    '.api-dialog::backdrop{background:rgba(11,22,21,.55);}',
    '.api-dialog h3{margin:0 0 12px;}',
    '.api-dialog dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;margin:0 0 18px;font-size:.92rem;}',
    '.api-dialog dt{font-weight:600;color:var(--pine-dark);}',
    '.api-dialog dd{margin:0;overflow-wrap:anywhere;}'
  ].join('\n');
  document.head.appendChild(estilo);

  /* ---------- Utilidades ---------- */
  function el(tag, props, hijos) {
    var nodo = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'text') nodo.textContent = props[k];
      else nodo.setAttribute(k, props[k]);
    });
    (hijos || []).forEach(function (h) { nodo.appendChild(typeof h === 'string' ? document.createTextNode(h) : h); });
    return nodo;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function hoyLocal() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* "2026-11-05" -> "05 nov 2026" (sin usar Date para evitar desfases de zona horaria) */
  function formatearFecha(iso) {
    var p = String(iso).split('-');
    if (p.length !== 3) return iso;
    return p[2] + ' ' + MESES[Number(p[1]) - 1] + ' ' + p[0];
  }

  function esFechaReal(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
    var p = texto.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
  }

  /* ---------- Mensajes ---------- */
  function mostrar(caja, tipo, titulo, lista) {
    caja.className = 'api-msg api-msg--' + tipo;
    caja.textContent = '';
    caja.appendChild(el('strong', { text: titulo }));
    if (lista && lista.length) {
      caja.appendChild(el('ul', {}, lista.map(function (t) { return el('li', { text: t }); })));
    }
    caja.hidden = false;
    return caja;
  }

  function ocultar(caja) {
    caja.hidden = true;
    caja.textContent = '';
  }

  /* ---------- Cliente HTTP ---------- */
  function ApiError(status, data) {
    this.name = 'ApiError';
    this.status = status;
    this.data = data || {};
    this.message = this.data.error || ('Error ' + status);
    this.detalles = Array.isArray(this.data.detalles) ? this.data.detalles : [];
  }
  ApiError.prototype = Object.create(Error.prototype);

  function NetworkError(mensaje) {
    this.name = 'NetworkError';
    this.message = mensaje;
  }
  NetworkError.prototype = Object.create(Error.prototype);

  /* Devuelve { status, data }. Lanza ApiError (4xx/5xx) o NetworkError (sin respuesta). */
  function peticion(metodo, ruta, cuerpo) {
    var control = new AbortController();
    var reloj = setTimeout(function () { control.abort(); }, TIMEOUT_MS);
    var opciones = { method: metodo, signal: control.signal, headers: { Accept: 'application/json' } };
    if (cuerpo !== undefined) {
      opciones.headers['Content-Type'] = 'application/json';
      opciones.body = JSON.stringify(cuerpo);
    }

    return fetch(API_URL + (ruta || ''), opciones)
      .catch(function (err) {
        if (err && err.name === 'AbortError') {
          throw new NetworkError('El servidor tardó demasiado en responder. Inténtalo de nuevo en unos segundos.');
        }
        throw new NetworkError('No se pudo conectar con el servidor. Verifica que esté en ejecución (cd backend && npm start) y vuelve a intentarlo.');
      })
      .then(function (res) {
        clearTimeout(reloj);
        if (res.status === 204) return { status: 204, data: null };
        return res.json().catch(function () { return null; }).then(function (data) {
          if (!res.ok) throw new ApiError(res.status, data);
          return { status: res.status, data: data };
        });
      })
      .catch(function (err) {
        clearTimeout(reloj);
        throw err;
      });
  }

  function textoDeError(err) {
    if (err instanceof NetworkError) return err.message;
    if (err instanceof ApiError && err.status >= 500) return 'El servidor tuvo un problema (error ' + err.status + '). Inténtalo más tarde.';
    return (err && err.message) || 'Ocurrió un error inesperado.';
  }

  /* ---------- Formulario: lectura y validación en el cliente ---------- */
  function valor(id) { return document.getElementById(id).value.trim(); }

  function leerFormulario() {
    var sexo = form.querySelector('input[name="sexo"]:checked');
    var recordatorios = Array.prototype.map.call(
      form.querySelectorAll('input[name="recordatorio"]:checked'),
      function (c) { return c.value; }
    );
    return {
      propietario: { nombre: valor('nombre'), correo: valor('correo'), telefono: valor('telefono'), canal: valor('canal') },
      mascota: {
        nombre: valor('mascota-nombre'),
        especie: valor('especie'),
        raza: valor('raza'),
        edad: Number(document.getElementById('edad').value),
        sexo: sexo ? sexo.value : 'hembra'
      },
      servicio: valor('servicio'),
      fecha: valor('fecha'),
      hora: valor('hora'),
      recordatorios: recordatorios,
      motivo: valor('motivo'),
      observaciones: valor('observaciones')
    };
  }

  /* Mismas reglas que el servidor (el servidor sigue siendo la validación definitiva). */
  function validarLocal(d) {
    var e = [];
    function add(campo, mensaje) { e.push({ campo: campo, mensaje: mensaje }); }

    if (!d.propietario.nombre) add('propietario.nombre', 'El nombre del propietario es obligatorio');
    if (!d.propietario.correo) add('correo', 'El correo es obligatorio');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.propietario.correo)) add('correo', 'Formato de correo no válido');

    if (!d.propietario.telefono) add('telefono', 'El teléfono es obligatorio');
    else {
      var digitos = d.propietario.telefono.replace(/\D/g, '').length;
      if (!/^[0-9 +]+$/.test(d.propietario.telefono) || digitos < 7 || digitos > 15) {
        add('telefono', 'El teléfono debe tener entre 7 y 15 dígitos (se permiten espacios y +)');
      }
    }

    if (!d.mascota.nombre) add('mascota.nombre', 'El nombre de la mascota es obligatorio');
    if (!(d.mascota.edad >= 0 && d.mascota.edad <= 20)) add('edad', 'La edad debe estar entre 0 y 20');

    if (!d.servicio) add('servicio', 'Selecciona un servicio');

    if (!d.fecha) add('fecha', 'La fecha es obligatoria');
    else if (!esFechaReal(d.fecha)) add('fecha', 'La fecha no es válida');
    else if (d.fecha < hoyLocal()) add('fecha', 'La fecha no puede ser anterior a hoy');

    if (!d.hora) add('hora', 'La hora es obligatoria');
    else if (d.hora < '08:00' || d.hora > '18:00') add('hora', 'La hora debe estar entre 08:00 y 18:00');

    return e;
  }

  function marcarCampos(detalles) {
    limpiarMarcas();
    var primero = null;
    detalles.forEach(function (d) {
      var sel = CAMPOS[d.campo];
      if (!sel) return;
      var nodos = form.querySelectorAll(sel);
      Array.prototype.forEach.call(nodos, function (n) { n.classList.add('api-invalid'); n.setAttribute('aria-invalid', 'true'); });
      if (!primero && nodos[0]) primero = nodos[0];
    });
    /* Un horario ocupado también afecta a la fecha */
    if (detalles.some(function (d) { return d.campo === 'hora' && /fecha y hora/i.test(d.mensaje); })) {
      var f = document.getElementById('fecha');
      f.classList.add('api-invalid');
    }
    if (primero) primero.focus();
  }

  function limpiarMarcas() {
    Array.prototype.forEach.call(form.querySelectorAll('.api-invalid'), function (n) {
      n.classList.remove('api-invalid');
      n.removeAttribute('aria-invalid');
    });
  }

  function mostrarErroresFormulario(titulo, detalles) {
    mostrar(formMsg, 'error', titulo, detalles.map(function (d) { return d.mensaje; }));
    marcarCampos(detalles);
  }

  function sincronizarEdad() {
    document.getElementById('edad-out').value = document.getElementById('edad').value;
  }

  function actualizarBoton() {
    botonEnviar.disabled = enviando;
    if (enviando) botonEnviar.textContent = 'Enviando…';
    else botonEnviar.textContent = editando ? 'Guardar cambios' : textoBotonEnviar;
  }

  /* ---------- Modo edición ---------- */
  function entrarModoEdicion(cita) {
    editando = { id: cita.id, estado: cita.estado };
    mostrar(formModo, 'info', 'Editando la cita #' + cita.id + ' de ' + cita.mascota.nombre,
      ['Modifica los datos y pulsa «Guardar cambios». Se reemplazará la cita completa.']);
    var cancelar = el('button', { type: 'button', class: 'api-btn', text: 'Cancelar edición' });
    cancelar.addEventListener('click', function () { form.reset(); });
    formModo.querySelector('strong').appendChild(cancelar);
    actualizarBoton();
  }

  function salirModoEdicion() {
    editando = null;
    ocultar(formModo);
    actualizarBoton();
  }

  function cargarEnFormulario(c) {
    function poner(id, v) { document.getElementById(id).value = v == null ? '' : v; }
    poner('nombre', c.propietario.nombre);
    poner('correo', c.propietario.correo);
    poner('telefono', c.propietario.telefono);
    poner('canal', c.propietario.canal || 'correo');
    poner('mascota-nombre', c.mascota.nombre);
    poner('especie', c.mascota.especie || 'perro');
    poner('raza', c.mascota.raza);
    poner('edad', c.mascota.edad == null ? 2 : c.mascota.edad);
    sincronizarEdad();
    var radio = form.querySelector('input[name="sexo"][value="' + c.mascota.sexo + '"]');
    if (radio) radio.checked = true;
    poner('servicio', c.servicio);
    poner('fecha', c.fecha);
    poner('hora', c.hora);
    Array.prototype.forEach.call(form.querySelectorAll('input[name="recordatorio"]'), function (chk) {
      chk.checked = (c.recordatorios || []).indexOf(chk.value) !== -1;
    });
    poner('motivo', c.motivo);
    poner('observaciones', c.observaciones);
  }

  /* ---------- Tabla (Expediente) ---------- */
  function filaMensaje(texto, clase) {
    return el('tr', {}, [el('td', { colspan: '5', class: clase || 'api-vacio', text: texto })]);
  }

  function filaCita(c) {
    var botones = el('div', { class: 'api-acciones' });
    var ver = el('button', { type: 'button', class: 'api-btn', text: 'Ver', 'aria-label': 'Ver cita ' + c.id });
    var editar = el('button', { type: 'button', class: 'api-btn', text: 'Editar', 'aria-label': 'Editar cita ' + c.id });
    var borrar = el('button', { type: 'button', class: 'api-btn api-btn--peligro', text: 'Eliminar', 'aria-label': 'Eliminar cita ' + c.id });
    ver.addEventListener('click', function () { verCita(c.id, ver); });
    editar.addEventListener('click', function () { editarCita(c.id, editar); });
    borrar.addEventListener('click', function () { eliminarCita(c, borrar); });
    [ver, editar, borrar].forEach(function (b) { botones.appendChild(b); });

    var mascota = c.mascota.nombre + (c.mascota.especie ? ' (' + (ESPECIES[c.mascota.especie] || c.mascota.especie).toLowerCase() + ')' : '');
    return el('tr', {}, [
      el('td', { text: formatearFecha(c.fecha) + ' · ' + c.hora }),
      el('td', { text: SERVICIOS[c.servicio] || c.servicio }),
      el('td', { text: mascota }),
      el('td', {}, [el('span', { class: 'badge api-estado-' + c.estado, text: ESTADOS[c.estado] || c.estado })]),
      el('td', {}, [botones])
    ]);
  }

  function cargarCitas() {
    tbody.textContent = '';
    tbody.appendChild(filaMensaje('Cargando citas…'));
    ocultar(listaMsg);

    return peticion('GET', '?limit=100')
      .then(function (r) {
        tbody.textContent = '';
        if (!r.data.data.length) {
          tbody.appendChild(filaMensaje('Aún no hay citas registradas. Solicita la primera con el formulario de arriba.'));
          return;
        }
        r.data.data.forEach(function (c) { tbody.appendChild(filaCita(c)); });
        if (r.data.total > r.data.data.length) {
          mostrar(listaMsg, 'info', 'Mostrando ' + r.data.data.length + ' de ' + r.data.total + ' citas.');
        }
      })
      .catch(function (err) {
        tbody.textContent = '';
        tbody.appendChild(filaMensaje('No se pudieron cargar las citas.', 'api-vacio'));
        mostrar(listaMsg, 'error', textoDeError(err));
        var reintentar = el('button', { type: 'button', class: 'api-btn', text: 'Reintentar' });
        reintentar.addEventListener('click', cargarCitas);
        listaMsg.querySelector('strong').appendChild(reintentar);
      });
  }

  /* ---------- Acciones por fila ---------- */
  function conBoton(boton, textoCarga, tarea) {
    var original = boton.textContent;
    boton.disabled = true;
    boton.textContent = textoCarga;
    return tarea().then(
      function (r) { boton.disabled = false; boton.textContent = original; return r; },
      function (e) { boton.disabled = false; boton.textContent = original; throw e; }
    );
  }

  function avisoDeLista(err, accion) {
    mostrar(listaMsg, 'error', 'No se pudo ' + accion + '.', [textoDeError(err)]);
    listaMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (err instanceof ApiError && err.status === 404) cargarCitas(); // ya no existe: refrescar lista
  }

  /* VER: GET /api/citas/:id */
  function verCita(id, boton) {
    ocultar(listaMsg);
    conBoton(boton, 'Cargando…', function () { return peticion('GET', '/' + id); })
      .then(function (r) { mostrarDetalle(r.data); })
      .catch(function (err) { avisoDeLista(err, 'consultar la cita'); });
  }

  function mostrarDetalle(c) {
    var filas = [
      ['Cita', '#' + c.id + ' · ' + (ESTADOS[c.estado] || c.estado)],
      ['Servicio', SERVICIOS[c.servicio] || c.servicio],
      ['Fecha y hora', formatearFecha(c.fecha) + ' a las ' + c.hora],
      ['Propietario', c.propietario.nombre],
      ['Correo', c.propietario.correo],
      ['Teléfono', c.propietario.telefono],
      ['Contacto preferido', CANALES[c.propietario.canal] || c.propietario.canal || '—'],
      ['Mascota', c.mascota.nombre],
      ['Especie', ESPECIES[c.mascota.especie] || c.mascota.especie || '—'],
      ['Raza', c.mascota.raza || '—'],
      ['Edad', c.mascota.edad == null ? '—' : c.mascota.edad + (c.mascota.edad === 1 ? ' año' : ' años')],
      ['Sexo', c.mascota.sexo ? c.mascota.sexo.charAt(0).toUpperCase() + c.mascota.sexo.slice(1) : '—'],
      ['Recordatorios', (c.recordatorios || []).map(function (r) { return RECORDATORIOS[r] || r; }).join(', ') || 'Ninguno'],
      ['Motivo', c.motivo || '—'],
      ['Observaciones', c.observaciones || '—'],
      ['Registrada', new Date(c.creadaEn).toLocaleString('es-CO')]
    ];
    var dl = el('dl');
    filas.forEach(function (f) {
      dl.appendChild(el('dt', { text: f[0] }));
      dl.appendChild(el('dd', { text: f[1] }));
    });
    var cerrar = el('button', { type: 'button', class: 'api-btn', text: 'Cerrar' });
    cerrar.addEventListener('click', function () { dialogo.close(); });

    dialogo.textContent = '';
    dialogo.appendChild(el('h3', { id: 'cita-detalle-titulo', text: 'Detalle de la cita' }));
    dialogo.appendChild(dl);
    dialogo.appendChild(cerrar);
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', '');
  }
  dialogo.addEventListener('click', function (e) { if (e.target === dialogo) dialogo.close(); }); // clic en el fondo

  /* EDITAR: GET /api/citas/:id, carga el formulario y el envío hará PUT */
  function editarCita(id, boton) {
    ocultar(listaMsg);
    conBoton(boton, 'Cargando…', function () { return peticion('GET', '/' + id); })
      .then(function (r) {
        limpiarMarcas();
        ocultar(formMsg);
        cargarEnFormulario(r.data);
        entrarModoEdicion(r.data);
        document.getElementById('citas').scrollIntoView({ behavior: 'smooth' });
      })
      .catch(function (err) { avisoDeLista(err, 'cargar la cita para editarla'); });
  }

  /* ELIMINAR: confirmación, DELETE /api/citas/:id y recarga de la lista */
  function eliminarCita(c, boton) {
    var pregunta = '¿Eliminar la cita #' + c.id + ' de ' + c.mascota.nombre + ' del ' + formatearFecha(c.fecha) + ' a las ' + c.hora + '?\nEsta acción no se puede deshacer.';
    if (!window.confirm(pregunta)) return;
    ocultar(listaMsg);

    conBoton(boton, 'Eliminando…', function () { return peticion('DELETE', '/' + c.id); })
      .then(function () {
        if (editando && editando.id === c.id) form.reset();
        return cargarCitas().then(function () {
          mostrar(listaMsg, 'ok', 'La cita #' + c.id + ' se eliminó correctamente.');
        });
      })
      .catch(function (err) { avisoDeLista(err, 'eliminar la cita'); });
  }

  /* ---------- Envío del formulario: POST (crear) o PUT (editar) ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (enviando) return;
    limpiarMarcas();
    ocultar(formMsg);

    var datos = leerFormulario();
    var errores = validarLocal(datos);
    if (errores.length) {
      mostrarErroresFormulario('Revisa los datos del formulario:', errores);
      return;
    }

    var edicion = editando;
    enviando = true;
    actualizarBoton();

    var llamada = edicion
      ? peticion('PUT', '/' + edicion.id, Object.assign({}, datos, { estado: edicion.estado }))
      : peticion('POST', '', datos);

    llamada
      .then(function (r) {
        var c = r.data;
        form.reset(); // dispara 'reset': sale del modo edición y limpia mensajes
        mostrar(formMsg, 'ok',
          edicion
            ? 'Cita #' + c.id + ' actualizada correctamente.'
            : '¡Solicitud enviada! Cita #' + c.id + ' programada para el ' + formatearFecha(c.fecha) + ' a las ' + c.hora + '.');
        return cargarCitas();
      })
      .catch(function (err) {
        if (err instanceof ApiError && err.detalles.length) {
          mostrarErroresFormulario(err.status === 409 ? 'Ese horario no está disponible:' : err.message + ':', err.detalles);
        } else {
          mostrar(formMsg, 'error', textoDeError(err));
        }
        if (edicion && err instanceof ApiError && err.status === 404) { // la cita fue eliminada mientras se editaba
          form.reset();
          mostrar(formMsg, 'error', 'La cita que estabas editando ya no existe.');
          cargarCitas();
        }
      })
      .then(function () {
        enviando = false;
        actualizarBoton();
      });
  });

  /* "Limpiar formulario" (y cancelar edición) */
  form.addEventListener('reset', function () {
    limpiarMarcas();
    ocultar(formMsg);
    salirModoEdicion();
    setTimeout(sincronizarEdad, 0); // el <output> de la edad no se actualiza solo al resetear
  });

  /* Quitar la marca roja al corregir un campo */
  form.addEventListener('input', function (e) {
    if (e.target.classList) e.target.classList.remove('api-invalid');
  });

  /* ---------- Inicio ---------- */
  document.getElementById('fecha').min = hoyLocal(); // el selector de fecha no permite días pasados
  cargarCitas();
})();
