// Pruebas unitarias del validador del navegador: node --test frontend/tests
const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../js/validators.js');

const HOY = '2026-10-20';
const VALIDA = {
  nombre: 'Ana Ruiz', correo: 'ana@mail.com', telefono: '300 123 4567',
  canal: 'correo', 'mascota-nombre': 'Toby', especie: 'perro', edad: '3',
  sexo: 'hembra', servicio: 'vacunacion', fecha: '2026-10-25', hora: '10:30'
};

test('JS-01 una cita válida no tiene errores', () => {
  assert.deepEqual(V.validarCita(VALIDA, HOY), {});
});

test('JS-02 teléfono exige 7-15 dígitos reales (paridad con backend)', () => {
  for (const v of ['+++++++', '1 2 3 4', '++573001234567', '123456']) {
    assert.equal(V.telefono(v), false, v);
  }
  for (const v of ['3001234567', '+57 300 1234']) assert.equal(V.telefono(v), true, v);
});

test('JS-03 valores límite de edad y hora', () => {
  assert.deepEqual(['-1', '0', '20', '21'].map(V.edad), [false, true, true, false]);
  assert.deepEqual(['07:59', '08:00', '18:00', '18:01', '25:00'].map(V.horario),
    [false, true, true, false, false]);
});

test('JS-04 cada campo inválido se reporta solo', () => {
  const casos = {
    nombre: 'Al', correo: 'x', telefono: '1', canal: 'paloma',
    'mascota-nombre': ' ', especie: 'dragon', edad: '99', servicio: '',
    fecha: '2020-01-01', hora: '23:00', sexo: 'x', raza: 'r'.repeat(61),
    motivo: 'm'.repeat(501), observaciones: 'o'.repeat(501)
  };
  for (const [campo, valor] of Object.entries(casos)) {
    assert.deepEqual(Object.keys(V.validarCita({ ...VALIDA, [campo]: valor }, HOY)), [campo], campo);
  }
});

test('JS-05 hoyISO usa la fecha local, no UTC', () => {
  const d = new Date();
  assert.equal(V.hoyISO(), `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
});

test('JS-06 fecha: hoy sí, ayer no, formato inválido no', () => {
  assert.equal(V.fecha('2026-10-20', HOY), true);
  assert.equal(V.fecha('2026-10-19', HOY), false);
  assert.equal(V.fecha('20/10/2026', HOY), false);
});
