const { hoy, esFechaValida } = require('./fechas');

const SERVICIOS = ['consulta-general', 'vacunacion', 'desparasitacion', 'consulta-preventiva', 'control', 'basica'];
const ESPECIES = ['perro', 'gato', 'ave', 'otro'];
const SEXOS = ['hembra', 'macho'];
const CANALES = ['correo', 'telefono', 'whatsapp'];
const ESTADOS = ['programada', 'completada', 'cancelada'];
const RECORDATORIOS = ['correo', 'sms'];

const HORA_MIN = '08:00';
const HORA_MAX = '18:00';
const EDAD_MIN = 0;
const EDAD_MAX = 20;
const LIMITE_MAX = 100;

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_TELEFONO = /^[0-9 +]+$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const vacio = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * Valida el cuerpo de una cita (POST y PUT usan las mismas reglas).
 * - Ignora id y creadaEn (los asigna el servidor).
 * - `estado` solo se lee si opciones.aceptarEstado es true (PUT); en POST el servidor lo fija.
 * Devuelve { detalles, valor }: si detalles está vacío, `valor` es la cita normalizada.
 */
function validarCita(body, opciones = {}) {
  const detalles = [];
  const error = (campo, mensaje) => detalles.push({ campo, mensaje });

  const b = esObjeto(body) ? body : {};
  const p = esObjeto(b.propietario) ? b.propietario : {};
  const m = esObjeto(b.mascota) ? b.mascota : {};

  const textoObligatorio = (valor, campo, etiqueta, max) => {
    if (vacio(valor)) { error(campo, `${etiqueta} es obligatorio`); return ''; }
    if (typeof valor !== 'string') { error(campo, `${etiqueta} debe ser texto`); return ''; }
    const t = valor.trim();
    if (t.length > max) error(campo, `${etiqueta} no puede superar ${max} caracteres`);
    return t;
  };

  const textoOpcional = (valor, campo, etiqueta, max) => {
    if (valor === undefined || valor === null) return '';
    if (typeof valor !== 'string') { error(campo, `${etiqueta} debe ser texto`); return ''; }
    const t = valor.trim();
    if (t.length > max) error(campo, `${etiqueta} no puede superar ${max} caracteres`);
    return t;
  };

  const opcionDe = (valor, campo, etiqueta, permitidos, porDefecto) => {
    if (vacio(valor)) return porDefecto;
    if (!permitidos.includes(valor)) {
      error(campo, `${etiqueta} debe ser uno de: ${permitidos.join(', ')}`);
      return porDefecto;
    }
    return valor;
  };

  // --- Propietario ---
  const propietario = {
    nombre: textoObligatorio(p.nombre, 'propietario.nombre', 'El nombre del propietario', 100),
    correo: '',
    telefono: '',
    canal: opcionDe(p.canal, 'canal', 'El canal de contacto', CANALES, 'correo'),
  };

  const correo = textoObligatorio(p.correo, 'correo', 'El correo', 120);
  if (correo) {
    if (RE_CORREO.test(correo)) propietario.correo = correo;
    else error('correo', 'Formato de correo no válido');
  }

  const telefono = textoObligatorio(p.telefono, 'telefono', 'El teléfono', 30);
  if (telefono) {
    const digitos = telefono.replace(/\D/g, '').length;
    if (RE_TELEFONO.test(telefono) && digitos >= 7 && digitos <= 15) propietario.telefono = telefono;
    else error('telefono', 'El teléfono debe tener entre 7 y 15 dígitos (se permiten espacios y +)');
  }

  // --- Mascota ---
  let edad = null;
  if (!vacio(m.edad)) {
    if (typeof m.edad === 'number' && Number.isFinite(m.edad) && m.edad >= EDAD_MIN && m.edad <= EDAD_MAX) {
      edad = m.edad;
    } else {
      error('edad', `La edad debe ser un número entre ${EDAD_MIN} y ${EDAD_MAX}`);
    }
  }

  const mascota = {
    nombre: textoObligatorio(m.nombre, 'mascota.nombre', 'El nombre de la mascota', 100),
    especie: opcionDe(m.especie, 'especie', 'La especie', ESPECIES, null),
    raza: textoOpcional(m.raza, 'raza', 'La raza', 60),
    edad,
    sexo: opcionDe(m.sexo, 'sexo', 'El sexo', SEXOS, null),
  };

  // --- Cita ---
  let servicio = '';
  if (vacio(b.servicio)) error('servicio', 'El servicio es obligatorio');
  else if (!SERVICIOS.includes(b.servicio)) error('servicio', `El servicio debe ser uno de: ${SERVICIOS.join(', ')}`);
  else servicio = b.servicio;

  let fecha = '';
  if (vacio(b.fecha)) error('fecha', 'La fecha es obligatoria');
  else if (!esFechaValida(b.fecha)) error('fecha', 'La fecha debe tener formato YYYY-MM-DD y ser una fecha real');
  else if (b.fecha < hoy()) error('fecha', 'La fecha no puede ser anterior a hoy');
  else fecha = b.fecha;

  let hora = '';
  if (vacio(b.hora)) error('hora', 'La hora es obligatoria');
  else if (typeof b.hora !== 'string' || !RE_HORA.test(b.hora)) error('hora', 'La hora debe tener formato HH:MM');
  else if (b.hora < HORA_MIN || b.hora > HORA_MAX) error('hora', `La hora debe estar entre ${HORA_MIN} y ${HORA_MAX}`);
  else hora = b.hora;

  let recordatorios = [];
  if (b.recordatorios !== undefined && b.recordatorios !== null) {
    if (!Array.isArray(b.recordatorios)) {
      error('recordatorios', 'Los recordatorios deben ser una lista');
    } else if (b.recordatorios.some((r) => !RECORDATORIOS.includes(r))) {
      error('recordatorios', `Los recordatorios permitidos son: ${RECORDATORIOS.join(', ')}`);
    } else {
      recordatorios = [...new Set(b.recordatorios)];
    }
  }

  const valor = {
    propietario,
    mascota,
    servicio,
    fecha,
    hora,
    recordatorios,
    motivo: textoOpcional(b.motivo, 'motivo', 'El motivo', 500),
    observaciones: textoOpcional(b.observaciones, 'observaciones', 'Las observaciones', 1000),
  };

  if (opciones.aceptarEstado && b.estado !== undefined) {
    if (ESTADOS.includes(b.estado)) valor.estado = b.estado;
    else error('estado', `El estado debe ser uno de: ${ESTADOS.join(', ')}`);
  }

  return { detalles, valor };
}

/** Valida los query params de GET /api/citas. */
function validarFiltros(query) {
  const detalles = [];
  const filtros = { page: 1, limit: 10 };
  const q = esObjeto(query) ? query : {};

  const leer = (campo) => {
    const v = q[campo];
    if (v === undefined) return undefined;
    if (typeof v !== 'string') { detalles.push({ campo, mensaje: `El parámetro ${campo} debe indicarse una sola vez` }); return undefined; }
    return v;
  };

  const estado = leer('estado');
  if (estado !== undefined) {
    if (ESTADOS.includes(estado)) filtros.estado = estado;
    else detalles.push({ campo: 'estado', mensaje: `El estado debe ser uno de: ${ESTADOS.join(', ')}` });
  }

  const servicio = leer('servicio');
  if (servicio !== undefined) {
    if (SERVICIOS.includes(servicio)) filtros.servicio = servicio;
    else detalles.push({ campo: 'servicio', mensaje: `El servicio debe ser uno de: ${SERVICIOS.join(', ')}` });
  }

  const fecha = leer('fecha');
  if (fecha !== undefined) {
    if (esFechaValida(fecha)) filtros.fecha = fecha;
    else detalles.push({ campo: 'fecha', mensaje: 'La fecha debe tener formato YYYY-MM-DD' });
  }

  const page = leer('page');
  if (page !== undefined) {
    if (/^\d+$/.test(page) && Number(page) >= 1) filtros.page = Number(page);
    else detalles.push({ campo: 'page', mensaje: 'page debe ser un entero mayor o igual a 1' });
  }

  const limit = leer('limit');
  if (limit !== undefined) {
    if (/^\d+$/.test(limit) && Number(limit) >= 1 && Number(limit) <= LIMITE_MAX) filtros.limit = Number(limit);
    else detalles.push({ campo: 'limit', mensaje: `limit debe ser un entero entre 1 y ${LIMITE_MAX}` });
  }

  return { detalles, filtros };
}

module.exports = {
  validarCita,
  validarFiltros,
  SERVICIOS, ESPECIES, SEXOS, CANALES, ESTADOS, RECORDATORIOS,
};
