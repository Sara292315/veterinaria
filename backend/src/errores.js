// Formato único de errores:
// { "error": "Datos inválidos", "detalles": [ { "campo": "correo", "mensaje": "..." } ] }

function enviarError(res, status, error, detalles) {
  const cuerpo = { error };
  if (Array.isArray(detalles) && detalles.length > 0) cuerpo.detalles = detalles;
  return res.status(status).json(cuerpo);
}

module.exports = { enviarError };
