const path = require('path');
const express = require('express');
const cors = require('cors');
const citasRouter = require('./routes/citas');
const { enviarError } = require('./errores');

const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API
  app.use('/api/citas', citasRouter);
  app.use('/api', (req, res) => enviarError(res, 404, 'Ruta no encontrada'));

  // Frontend estático (mismo origen que la API)
  app.use(express.static(FRONTEND_DIR));

  // Errores no controlados (JSON mal formado, etc.) con el mismo formato
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return enviarError(res, 400, 'JSON inválido', [{ campo: 'cuerpo', mensaje: 'El cuerpo de la petición no es un JSON válido' }]);
    }
    if (err.status && err.status >= 400 && err.status < 500) {
      return enviarError(res, err.status, err.message);
    }
    console.error(err);
    return enviarError(res, 500, 'Error interno del servidor');
  });

  return app;
}

module.exports = { createApp, FRONTEND_DIR };
