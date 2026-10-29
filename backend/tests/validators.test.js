const { validarCita, validarFiltros } = require('../src/validators');
const { enDias, esFechaValida } = require('../src/fechas');

const base = () => ({
  propietario: { nombre: 'Ana', correo: 'ana@ejemplo.com', telefono: '+57 300 123 4567' },
  mascota: { nombre: 'Nina' },
  servicio: 'control',
  fecha: enDias(5),
  hora: '10:00',
});

describe('validarCita', () => {
  test('acepta un teléfono con + y espacios (12 dígitos)', () => {
    expect(validarCita(base()).detalles).toEqual([]);
  });

  test('normaliza: recorta espacios y quita recordatorios repetidos', () => {
    const { valor, detalles } = validarCita({ ...base(), motivo: '  dolor  ', recordatorios: ['sms', 'sms', 'correo'] });
    expect(detalles).toEqual([]);
    expect(valor.motivo).toBe('dolor');
    expect(valor.recordatorios).toEqual(['sms', 'correo']);
  });

  test('un cuerpo que no es objeto produce errores en los campos obligatorios', () => {
    expect(validarCita(null).detalles.length).toBeGreaterThanOrEqual(7);
    expect(validarCita('texto').detalles.length).toBeGreaterThanOrEqual(7);
  });

  test('solo acepta `estado` cuando se pide (PUT)', () => {
    expect(validarCita({ ...base(), estado: 'xyz' }).detalles).toEqual([]);
    expect(validarCita({ ...base(), estado: 'xyz' }, { aceptarEstado: true }).detalles).toHaveLength(1);
    expect(validarCita({ ...base(), estado: 'cancelada' }, { aceptarEstado: true }).valor.estado).toBe('cancelada');
  });

  test('la edad debe ser numérica', () => {
    const b = base();
    b.mascota.edad = '3';
    expect(validarCita(b).detalles.map((d) => d.campo)).toContain('edad');
  });
});

describe('validarFiltros', () => {
  test('valores por defecto: page 1, limit 10', () => {
    expect(validarFiltros({})).toEqual({ detalles: [], filtros: { page: 1, limit: 10 } });
  });

  test('rechaza parámetros repetidos', () => {
    expect(validarFiltros({ estado: ['programada', 'cancelada'] }).detalles).toHaveLength(1);
  });
});

describe('esFechaValida', () => {
  test.each([['2026-11-05', true], ['2026-02-30', false], ['2026-13-01', false], ['26-11-05', false], ['', false], [null, false]])(
    '%s → %s',
    (texto, esperado) => expect(esFechaValida(texto)).toBe(esperado)
  );
});
