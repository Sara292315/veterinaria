const express = require('express');
const store = require('../store');
const { validarCita, validarFiltros } = require('../validators');
const { enviarError } = require('../errores');

const router = express.Router();

const MSG_CONFLICTO = 'Ya existe una cita no cancelada en esa fecha y hora';

/** Devuelve el id numérico o responde 400 y devuelve null. */
function leerId(req, res) {
  if (!/^\d+$/.test(req.params.id)) {
    enviarError(res, 400, 'Id inválido', [{ campo: 'id', mensaje: 'El id debe ser un número entero' }]);
    return null;
  }
  return Number(req.params.id);
}

function responderConflicto(res) {
  return enviarError(res, 409, 'Horario no disponible', [{ campo: 'hora', mensaje: MSG_CONFLICTO }]);
}

// 1) Consultar información (listar)
router.get('/', (req, res) => {
  const { detalles, filtros } = validarFiltros(req.query);
  if (detalles.length) return enviarError(res, 400, 'Filtros inválidos', detalles);

  const { total, data } = store.listar(filtros);
  return res.status(200).json({ total, page: filtros.page, limit: filtros.limit, data });
});

// 2) Consultar un elemento
router.get('/:id', (req, res) => {
  const id = leerId(req, res);
  if (id === null) return undefined;

  const cita = store.buscar(id);
  if (!cita) return enviarError(res, 404, 'Cita no encontrada');
  return res.status(200).json(cita);
});

// 3) Crear
router.post('/', (req, res) => {
  const { detalles, valor } = validarCita(req.body);
  if (detalles.length) return enviarError(res, 400, 'Datos inválidos', detalles);

  if (store.buscarConflicto(valor.fecha, valor.hora)) return responderConflicto(res);

  const creada = store.crear(valor);
  return res.status(201).location(`/api/citas/${creada.id}`).json(creada);
});

// 4) Actualizar (reemplazo completo)
router.put('/:id', (req, res) => {
  const id = leerId(req, res);
  if (id === null) return undefined;

  const actual = store.buscar(id);
  if (!actual) return enviarError(res, 404, 'Cita no encontrada');

  const { detalles, valor } = validarCita(req.body, { aceptarEstado: true });
  if (detalles.length) return enviarError(res, 400, 'Datos inválidos', detalles);

  const estadoFinal = valor.estado || actual.estado;
  if (estadoFinal !== 'cancelada' && store.buscarConflicto(valor.fecha, valor.hora, id)) {
    return responderConflicto(res);
  }

  return res.status(200).json(store.reemplazar(id, valor));
});

// 5) Eliminar
router.delete('/:id', (req, res) => {
  const id = leerId(req, res);
  if (id === null) return undefined;

  if (!store.eliminar(id)) return enviarError(res, 404, 'Cita no encontrada');
  return res.status(204).end();
});

module.exports = router;
