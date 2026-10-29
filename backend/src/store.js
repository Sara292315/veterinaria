// Almacenamiento en memoria (sin base de datos). Los datos se reinician al reiniciar el servidor.
const { enDias } = require('./fechas');

let citas = [];
let siguienteId = 1;

const copia = (cita) => (cita ? structuredClone(cita) : cita);

function crearSemilla() {
  const ahora = new Date().toISOString();
  return [
    {
      propietario: { nombre: 'Sarah Morgensztern', correo: 'sarah@ejemplo.com', telefono: '300 123 4567', canal: 'whatsapp' },
      mascota: { nombre: 'Toby', especie: 'perro', raza: 'Criollo', edad: 3, sexo: 'macho' },
      servicio: 'control', fecha: enDias(3), hora: '09:00',
      recordatorios: ['correo'], motivo: 'Seguimiento de tratamiento', observaciones: '', estado: 'programada',
    },
    {
      propietario: { nombre: 'Carlos Pérez', correo: 'carlos.perez@ejemplo.com', telefono: '+57 310 555 0199', canal: 'telefono' },
      mascota: { nombre: 'Luna', especie: 'gato', raza: 'Siamés', edad: 2, sexo: 'hembra' },
      servicio: 'vacunacion', fecha: enDias(5), hora: '10:30',
      recordatorios: ['correo', 'sms'], motivo: 'Refuerzo de vacunas', observaciones: 'Es nerviosa con extraños', estado: 'programada',
    },
    {
      propietario: { nombre: 'María Gómez', correo: 'maria.gomez@ejemplo.com', telefono: '3205550142', canal: 'correo' },
      mascota: { nombre: 'Rocky', especie: 'perro', raza: 'Labrador', edad: 6, sexo: 'macho' },
      servicio: 'consulta-general', fecha: enDias(10), hora: '15:00',
      recordatorios: [], motivo: 'Revisión general', observaciones: '', estado: 'programada',
    },
    {
      propietario: { nombre: 'Andrea Ruiz', correo: 'andrea.ruiz@ejemplo.com', telefono: '315 555 0100', canal: 'whatsapp' },
      mascota: { nombre: 'Kiwi', especie: 'ave', raza: 'Periquito', edad: 1, sexo: 'hembra' },
      servicio: 'desparasitacion', fecha: enDias(-20), hora: '11:00',
      recordatorios: ['sms'], motivo: '', observaciones: '', estado: 'completada',
    },
  ].map((c) => ({ id: siguienteId++, ...c, creadaEn: ahora }));
}

/** Vuelve al estado inicial (3-4 citas de ejemplo). Útil para pruebas. */
function reset() {
  siguienteId = 1;
  citas = crearSemilla();
}

function listar({ estado, servicio, fecha, page, limit }) {
  const filtradas = citas
    .filter((c) => (estado ? c.estado === estado : true))
    .filter((c) => (servicio ? c.servicio === servicio : true))
    .filter((c) => (fecha ? c.fecha === fecha : true))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora) || a.id - b.id);
  const inicio = (page - 1) * limit;
  return { total: filtradas.length, data: filtradas.slice(inicio, inicio + limit).map(copia) };
}

function buscar(id) {
  return copia(citas.find((c) => c.id === id));
}

/** Cita NO cancelada, distinta de `excluirId`, en la misma fecha y hora. */
function buscarConflicto(fecha, hora, excluirId) {
  return copia(citas.find((c) => c.estado !== 'cancelada' && c.fecha === fecha && c.hora === hora && c.id !== excluirId));
}

function crear(datos) {
  const cita = {
    id: siguienteId++,
    propietario: datos.propietario,
    mascota: datos.mascota,
    servicio: datos.servicio,
    fecha: datos.fecha,
    hora: datos.hora,
    recordatorios: datos.recordatorios,
    motivo: datos.motivo,
    observaciones: datos.observaciones,
    estado: 'programada',
    creadaEn: new Date().toISOString(),
  };
  citas.push(cita);
  return copia(cita);
}

/** Reemplazo completo: conserva id y creadaEn; conserva el estado si no llega uno nuevo. */
function reemplazar(id, datos) {
  const i = citas.findIndex((c) => c.id === id);
  if (i === -1) return null;
  const previa = citas[i];
  citas[i] = {
    id: previa.id,
    propietario: datos.propietario,
    mascota: datos.mascota,
    servicio: datos.servicio,
    fecha: datos.fecha,
    hora: datos.hora,
    recordatorios: datos.recordatorios,
    motivo: datos.motivo,
    observaciones: datos.observaciones,
    estado: datos.estado || previa.estado,
    creadaEn: previa.creadaEn,
  };
  return copia(citas[i]);
}

function eliminar(id) {
  const i = citas.findIndex((c) => c.id === id);
  if (i === -1) return false;
  citas.splice(i, 1);
  return true;
}

reset();

module.exports = { reset, listar, buscar, buscarConflicto, crear, reemplazar, eliminar };
