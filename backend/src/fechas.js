// Utilidades de fecha en hora LOCAL del servidor (formato YYYY-MM-DD).

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatear(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Fecha de hoy como YYYY-MM-DD. */
function hoy() {
  return formatear(new Date());
}

/** Fecha de hoy + n días (n puede ser negativo) como YYYY-MM-DD. */
function enDias(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return formatear(d);
}

/** true si el texto es YYYY-MM-DD y es una fecha real del calendario (rechaza 2026-02-30). */
function esFechaValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [y, m, d] = texto.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

module.exports = { hoy, enDias, esFechaValida };
