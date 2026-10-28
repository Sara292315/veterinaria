/* Validaciones del formulario de citas (espejo de backend/validators.py).
 * El servidor vuelve a validar todo: esto solo da respuesta inmediata. */
const Validators = (() => {
  const LIMITES = {
    telefonoMin: 7, telefonoMax: 15, nombreMin: 3, nombreMax: 100,
    mascotaMax: 50, razaMax: 60, textoLibreMax: 500, edadMin: 0, edadMax: 20,
    apertura: '08:00', cierre: '18:00'
  };
  const CANALES = ['correo', 'telefono', 'whatsapp'];
  const ESPECIES = ['perro', 'gato', 'ave', 'otro'];
  const SEXOS = ['hembra', 'macho'];
  const SERVICIOS = ['consulta-general', 'vacunacion', 'desparasitacion',
    'consulta-preventiva', 'control', 'basica'];

  const texto = v => (typeof v === 'string' ? v.trim() : '');
  const correo = v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(texto(v));
  const telefono = v => {
    if (typeof v !== 'string') return false;
    const numero = v.replace(/ /g, '').replace(/^\+/, '');
    return /^[0-9]+$/.test(numero) &&
      numero.length >= LIMITES.telefonoMin && numero.length <= LIMITES.telefonoMax;
  };
  const hoyISO = () => {
    const d = new Date();               // fecha LOCAL, no UTC
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const fecha = (v, hoy = hoyISO()) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(v)) && v >= hoy;
  const horario = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(v || '') &&
    v >= LIMITES.apertura && v <= LIMITES.cierre;
  const edad = v => /^\d+$/.test(String(v ?? '')) &&
    Number(v) >= LIMITES.edadMin && Number(v) <= LIMITES.edadMax;
  const longitud = (v, min, max) => texto(v).length >= min && texto(v).length <= max;
  const opcionalHasta = (v, max) => v == null || (typeof v === 'string' && v.length <= max);

  function validarCita(d, hoy = hoyISO()) {
    const e = {};
    if (!longitud(d.nombre, LIMITES.nombreMin, LIMITES.nombreMax)) {
      e.nombre = `El nombre debe tener entre ${LIMITES.nombreMin} y ${LIMITES.nombreMax} caracteres.`;
    }
    if (!correo(d.correo)) e.correo = 'Correo electrónico no válido.';
    if (!telefono(d.telefono)) {
      e.telefono = `El teléfono debe tener entre ${LIMITES.telefonoMin} y ${LIMITES.telefonoMax} dígitos.`;
    }
    if (!CANALES.includes(d.canal)) e.canal = 'Canal de contacto no válido.';
    if (!longitud(d['mascota-nombre'], 1, LIMITES.mascotaMax)) {
      e['mascota-nombre'] = `Indica el nombre de la mascota (máximo ${LIMITES.mascotaMax} caracteres).`;
    }
    if (!ESPECIES.includes(d.especie)) e.especie = 'Especie no válida.';
    if (!opcionalHasta(d.raza, LIMITES.razaMax)) e.raza = `La raza admite máximo ${LIMITES.razaMax} caracteres.`;
    if (d.sexo != null && !SEXOS.includes(d.sexo)) e.sexo = 'Sexo no válido.';
    if (!edad(d.edad)) e.edad = `La edad debe estar entre ${LIMITES.edadMin} y ${LIMITES.edadMax} años.`;
    if (!SERVICIOS.includes(d.servicio)) e.servicio = 'Selecciona un servicio.';
    if (!opcionalHasta(d.motivo, LIMITES.textoLibreMax)) {
      e.motivo = `El motivo admite máximo ${LIMITES.textoLibreMax} caracteres.`;
    }
    if (!opcionalHasta(d.observaciones, LIMITES.textoLibreMax)) {
      e.observaciones = `Las observaciones admiten máximo ${LIMITES.textoLibreMax} caracteres.`;
    }
    if (!horario(d.hora)) e.hora = 'El horario de atención es de 8:00 a 18:00.';
    if (!fecha(d.fecha, hoy)) e.fecha = 'La fecha no puede estar en el pasado.';
    return e;
  }
  return { LIMITES, correo, telefono, fecha, horario, edad, hoyISO, validarCita };
})();

if (typeof module !== 'undefined') module.exports = Validators; // pruebas en Node
