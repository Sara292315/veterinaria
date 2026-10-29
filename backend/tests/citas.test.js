const request = require('supertest');
const { createApp } = require('../src/app');
const store = require('../src/store');
const { enDias } = require('../src/fechas');

const app = createApp();

/** Cita válida en un horario libre (la semilla usa +3/+5/+10 días y -20). */
function citaValida(cambios = {}) {
  return {
    propietario: { nombre: 'Laura Test', correo: 'laura@ejemplo.com', telefono: '300 111 2222', canal: 'correo' },
    mascota: { nombre: 'Max', especie: 'perro', raza: 'Criollo', edad: 4, sexo: 'macho' },
    servicio: 'vacunacion',
    fecha: enDias(30),
    hora: '12:00',
    recordatorios: ['correo', 'sms'],
    motivo: 'Vacuna anual',
    observaciones: '',
    ...cambios,
  };
}

const campos = (res) => res.body.detalles.map((d) => d.campo);

beforeEach(() => store.reset());

describe('GET /api/citas (listar)', () => {
  test('200: devuelve total, page, limit y data con las citas de ejemplo', async () => {
    const res = await request(app).get('/api/citas');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 4, page: 1, limit: 10 });
    expect(res.body.data).toHaveLength(4);
    expect(res.body.data[0]).toHaveProperty('id');
  });

  test('200: filtra por estado', async () => {
    const res = await request(app).get('/api/citas?estado=completada');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data.every((c) => c.estado === 'completada')).toBe(true);
  });

  test('200: filtra por servicio', async () => {
    const res = await request(app).get('/api/citas?servicio=vacunacion');
    expect(res.status).toBe(200);
    expect(res.body.data.every((c) => c.servicio === 'vacunacion')).toBe(true);
    expect(res.body.total).toBe(1);
  });

  test('200: filtra por fecha', async () => {
    const res = await request(app).get(`/api/citas?fecha=${enDias(3)}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].fecha).toBe(enDias(3));
  });

  test('200: pagina con page y limit', async () => {
    const res = await request(app).get('/api/citas?page=2&limit=3');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 4, page: 2, limit: 3 });
    expect(res.body.data).toHaveLength(1);
  });

  test('200: una página fuera de rango devuelve data vacía', async () => {
    const res = await request(app).get('/api/citas?page=99');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test.each([
    ['estado=xyz', 'estado'],
    ['servicio=peluqueria', 'servicio'],
    ['fecha=05-11-2026', 'fecha'],
    ['page=0', 'page'],
    ['page=abc', 'page'],
    ['limit=0', 'limit'],
    ['limit=1000', 'limit'],
  ])('400: filtro inválido (%s)', async (query, campo) => {
    const res = await request(app).get(`/api/citas?${query}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(campos(res)).toContain(campo);
  });
});

describe('GET /api/citas/:id (consultar uno)', () => {
  test('200: devuelve la cita', async () => {
    const res = await request(app).get('/api/citas/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.mascota.nombre).toBe('Toby');
  });

  test('404: la cita no existe', async () => {
    const res = await request(app).get('/api/citas/999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Cita no encontrada' });
  });

  test('400: id no numérico', async () => {
    const res = await request(app).get('/api/citas/abc');
    expect(res.status).toBe(400);
    expect(campos(res)).toContain('id');
  });
});

describe('POST /api/citas (crear)', () => {
  test('201: crea la cita, asigna id/estado/creadaEn y devuelve Location', async () => {
    const res = await request(app).post('/api/citas').send(citaValida());
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(5); // la semilla ocupa 1..4 (autoincremental)
    expect(res.body.estado).toBe('programada');
    expect(new Date(res.body.creadaEn).toString()).not.toBe('Invalid Date');
    expect(res.headers.location).toBe('/api/citas/5');
    expect(res.body.propietario.nombre).toBe('Laura Test');
  });

  test('201: la cita creada se puede consultar después', async () => {
    const creada = await request(app).post('/api/citas').send(citaValida());
    const res = await request(app).get(creada.headers.location);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(creada.body);
  });

  test('201: ignora id, estado y creadaEn enviados por el cliente', async () => {
    const res = await request(app)
      .post('/api/citas')
      .send(citaValida({ id: 99, estado: 'completada', creadaEn: '2000-01-01T00:00:00Z' }));
    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe(99);
    expect(res.body.estado).toBe('programada');
    expect(res.body.creadaEn).not.toBe('2000-01-01T00:00:00Z');
  });

  test('201: solo con los campos obligatorios', async () => {
    const res = await request(app).post('/api/citas').send({
      propietario: { nombre: 'Ana', correo: 'ana@ejemplo.com', telefono: '3001234567' },
      mascota: { nombre: 'Nina' },
      servicio: 'control',
      fecha: enDias(20),
      hora: '08:00',
    });
    expect(res.status).toBe(201);
    expect(res.body.recordatorios).toEqual([]);
  });

  test('400: faltan los campos obligatorios (errores por campo)', async () => {
    const res = await request(app).post('/api/citas').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos inválidos');
    expect(campos(res)).toEqual(
      expect.arrayContaining(['propietario.nombre', 'correo', 'telefono', 'mascota.nombre', 'servicio', 'fecha', 'hora'])
    );
    res.body.detalles.forEach((d) => {
      expect(typeof d.campo).toBe('string');
      expect(typeof d.mensaje).toBe('string');
    });
  });

  test.each([
    ['correo sin formato válido', { propietario: { nombre: 'A', correo: 'no-es-correo', telefono: '3001234567' } }, 'correo'],
    ['teléfono con pocos dígitos', { propietario: { nombre: 'A', correo: 'a@b.co', telefono: '12345' } }, 'telefono'],
    ['teléfono con letras', { propietario: { nombre: 'A', correo: 'a@b.co', telefono: '300abc4567' } }, 'telefono'],
    ['teléfono con demasiados dígitos', { propietario: { nombre: 'A', correo: 'a@b.co', telefono: '1234567890123456' } }, 'telefono'],
    ['canal fuera de lista', { propietario: { nombre: 'A', correo: 'a@b.co', telefono: '3001234567', canal: 'paloma' } }, 'canal'],
    ['especie fuera de lista', { mascota: { nombre: 'M', especie: 'dragon' } }, 'especie'],
    ['sexo fuera de lista', { mascota: { nombre: 'M', sexo: 'x' } }, 'sexo'],
    ['edad mayor a 20', { mascota: { nombre: 'M', edad: 21 } }, 'edad'],
    ['edad negativa', { mascota: { nombre: 'M', edad: -1 } }, 'edad'],
    ['servicio fuera de lista', { servicio: 'peluqueria' }, 'servicio'],
    ['fecha con formato incorrecto', { fecha: '05/11/2026' }, 'fecha'],
    ['fecha inexistente', { fecha: '2099-02-30' }, 'fecha'],
    ['fecha anterior a hoy', { fecha: enDias(-1) }, 'fecha'],
    ['hora antes de las 08:00', { hora: '07:59' }, 'hora'],
    ['hora después de las 18:00', { hora: '18:01' }, 'hora'],
    ['hora con formato incorrecto', { hora: '9am' }, 'hora'],
    ['recordatorio no permitido', { recordatorios: ['paloma'] }, 'recordatorios'],
  ])('400: %s', async (_nombre, cambios, campo) => {
    const base = citaValida();
    const cuerpo = { ...base, ...cambios };
    if (cambios.propietario) cuerpo.propietario = { ...base.propietario, ...cambios.propietario };
    if (cambios.mascota) cuerpo.mascota = { ...base.mascota, ...cambios.mascota };
    const res = await request(app).post('/api/citas').send(cuerpo);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos inválidos');
    expect(campos(res)).toContain(campo);
  });

  test('201: acepta los límites exactos (hora 08:00 y 18:00, edad 0 y 20)', async () => {
    const a = await request(app).post('/api/citas').send(citaValida({ hora: '08:00', mascota: { nombre: 'M', edad: 0 } }));
    const b = await request(app).post('/api/citas').send(citaValida({ hora: '18:00', mascota: { nombre: 'M', edad: 20 } }));
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
  });

  test('201: acepta una cita para hoy', async () => {
    const res = await request(app).post('/api/citas').send(citaValida({ fecha: enDias(0) }));
    expect(res.status).toBe(201);
  });

  test('400: JSON mal formado usa el formato único de errores', async () => {
    const res = await request(app).post('/api/citas').set('Content-Type', 'application/json').send('{"propietario": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JSON inválido');
  });

  test('409: ya existe una cita no cancelada en la misma fecha y hora', async () => {
    const primera = await request(app).post('/api/citas').send(citaValida());
    expect(primera.status).toBe(201);
    const res = await request(app).post('/api/citas').send(citaValida({ mascota: { nombre: 'Otro' } }));
    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });

  test('201: se puede reutilizar el horario de una cita cancelada', async () => {
    const primera = await request(app).post('/api/citas').send(citaValida());
    await request(app).put(`/api/citas/${primera.body.id}`).send({ ...citaValida(), estado: 'cancelada' });
    const res = await request(app).post('/api/citas').send(citaValida());
    expect(res.status).toBe(201);
  });
});

describe('PUT /api/citas/:id (actualizar)', () => {
  test('200: reemplaza la cita completa y conserva id, estado y creadaEn', async () => {
    const antes = (await request(app).get('/api/citas/2')).body;
    const res = await request(app)
      .put('/api/citas/2')
      .send(citaValida({ servicio: 'control', motivo: 'Nuevo motivo', mascota: { nombre: 'Luna II', edad: 3 } }));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(2);
    expect(res.body.servicio).toBe('control');
    expect(res.body.mascota.nombre).toBe('Luna II');
    expect(res.body.estado).toBe(antes.estado);
    expect(res.body.creadaEn).toBe(antes.creadaEn);
    // reemplazo completo: lo que no se envía se vacía (la raza no venía en el cuerpo)
    expect(res.body.mascota.raza).toBe('');
    const despues = await request(app).get('/api/citas/2');
    expect(despues.body).toEqual(res.body);
  });

  test('200: permite cambiar el estado (p. ej. cancelar)', async () => {
    const res = await request(app).put('/api/citas/1').send(citaValida({ estado: 'cancelada' }));
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('cancelada');
  });

  test('200: guardar una cita con su mismo horario no cuenta como conflicto', async () => {
    const actual = (await request(app).get('/api/citas/1')).body;
    const res = await request(app).put('/api/citas/1').send(citaValida({ fecha: actual.fecha, hora: actual.hora }));
    expect(res.status).toBe(200);
  });

  test('400: datos inválidos', async () => {
    const res = await request(app).put('/api/citas/1').send(citaValida({ hora: '23:00', servicio: 'nada' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos inválidos');
    expect(campos(res)).toEqual(expect.arrayContaining(['hora', 'servicio']));
  });

  test('400: estado fuera de lista', async () => {
    const res = await request(app).put('/api/citas/1').send(citaValida({ estado: 'xyz' }));
    expect(res.status).toBe(400);
    expect(campos(res)).toContain('estado');
  });

  test('400: id no numérico', async () => {
    const res = await request(app).put('/api/citas/abc').send(citaValida());
    expect(res.status).toBe(400);
  });

  test('404: la cita no existe', async () => {
    const res = await request(app).put('/api/citas/999').send(citaValida());
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Cita no encontrada' });
  });

  test('409: el nuevo horario está ocupado por otra cita', async () => {
    const ocupada = (await request(app).get('/api/citas/2')).body;
    const res = await request(app).put('/api/citas/1').send(citaValida({ fecha: ocupada.fecha, hora: ocupada.hora }));
    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });
});

describe('DELETE /api/citas/:id (eliminar)', () => {
  test('204: elimina la cita y responde con cuerpo vacío', async () => {
    const res = await request(app).delete('/api/citas/1');
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(res.body).toEqual({});
  });

  test('204: después de eliminar, la cita ya no existe (404) y el total baja', async () => {
    await request(app).delete('/api/citas/1');
    expect((await request(app).get('/api/citas/1')).status).toBe(404);
    expect((await request(app).get('/api/citas')).body.total).toBe(3);
  });

  test('204: los ids no se reutilizan tras eliminar', async () => {
    await request(app).delete('/api/citas/4');
    const res = await request(app).post('/api/citas').send(citaValida());
    expect(res.body.id).toBe(5);
  });

  test('404: la cita no existe', async () => {
    const res = await request(app).delete('/api/citas/999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Cita no encontrada' });
  });

  test('404: eliminar dos veces la misma cita', async () => {
    await request(app).delete('/api/citas/2');
    const res = await request(app).delete('/api/citas/2');
    expect(res.status).toBe(404);
  });

  test('400: id no numérico', async () => {
    const res = await request(app).delete('/api/citas/abc');
    expect(res.status).toBe(400);
  });
});

describe('Servidor (CORS, rutas y frontend estático)', () => {
  test('CORS habilitado en la API', async () => {
    const res = await request(app).get('/api/citas').set('Origin', 'http://otro-origen.test');
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  test('404 con el formato único para rutas /api desconocidas', async () => {
    const res = await request(app).get('/api/mascotas');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Ruta no encontrada' });
  });

  test('200: sirve el frontend (index.html y api.js) en el mismo origen', async () => {
    const home = await request(app).get('/');
    expect(home.status).toBe(200);
    expect(home.headers['content-type']).toMatch(/html/);
    expect(home.text).toContain('js/api.js');
    const js = await request(app).get('/js/api.js');
    expect(js.status).toBe(200);
  });
});
