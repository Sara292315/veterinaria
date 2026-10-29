# VetConnect — Citas y expediente para tu mascota

Prototipo académico (Pruebas del Software). Frontend en HTML/CSS/JS (con animaciones GSAP) y un
backend REST en **Node.js + Express** para gestionar el recurso **Cita**. Express sirve también la
carpeta `frontend/`, así que página y API comparten el mismo origen (`http://localhost:3000`).

## Estructura

```
veterinaria/
├── frontend/            # index.html, css/style.css, js/script.js (animaciones) y js/api.js (fetch a la API)
├── backend/
│   ├── src/             # app.js, server.js, store.js (datos en memoria), validators.js, routes/citas.js
│   ├── tests/           # pruebas Jest + Supertest
│   └── package.json
└── README.md
```

## Requisitos

- Node.js 18 o superior (probado con Node 22)

## Instalar y ejecutar

```bash
cd backend
npm install
npm start
```

Abre **http://localhost:3000**. La API queda en `http://localhost:3000/api/citas`.
(Para usar otro puerto: `PORT=4000 npm start`.)

Los datos viven en memoria: al iniciar se cargan 4 citas de ejemplo y al reiniciar el servidor se pierden los cambios.

## Pruebas

```bash
cd backend
npm test
```

Jest + Supertest cubren las 5 operaciones y los códigos 200, 201, 204, 400, 404 y 409
(más pruebas unitarias de las validaciones).

## Las 5 operaciones

Recurso: **Cita** — todas las rutas cuelgan de `/api/citas`.

| # | Operación | Método | Endpoint | Entrada | Respuesta | Códigos HTTP |
|---|-----------|--------|----------|---------|-----------|--------------|
| 1 | Consultar información (listar) | GET | `/api/citas` | Sin cuerpo. Query opcional: `estado`, `servicio`, `fecha`, `page`, `limit` | `{ "total", "page", "limit", "data": [ ...citas ] }` | **200** OK · **400** filtro inválido (ej. `estado=xyz`) |
| 2 | Consultar un elemento | GET | `/api/citas/:id` | Solo el `id` en la URL | El objeto cita | **200** OK · **404** no existe · **400** id no numérico |
| 3 | Crear | POST | `/api/citas` | JSON con los campos de la cita (sin `id`, `estado` ni `creadaEn`) | La cita creada (con `id`, `estado: "programada"`, `creadaEn`) y header `Location: /api/citas/{id}` | **201** Created · **400** datos inválidos · **409** ya hay una cita no cancelada en esa fecha y hora |
| 4 | Actualizar (reemplazo completo) | PUT | `/api/citas/:id` | `id` en la URL + JSON con la cita completa (mismas validaciones que al crear; `estado` opcional) | La cita actualizada | **200** OK · **400** datos inválidos o id no numérico · **404** no existe · **409** horario ocupado por otra cita |
| 5 | Eliminar | DELETE | `/api/citas/:id` | Solo el `id` en la URL | Cuerpo vacío | **204** No Content · **404** no existe · **400** id no numérico |

Paginación: `page` ≥ 1 (por defecto 1) y `limit` entre 1 y 100 (por defecto 10). La lista viene ordenada por fecha y hora.

### Modelo de Cita

```json
{
  "id": 15,
  "propietario": { "nombre": "", "correo": "", "telefono": "", "canal": "correo | telefono | whatsapp" },
  "mascota": { "nombre": "", "especie": "perro | gato | ave | otro", "raza": "", "edad": 2, "sexo": "hembra | macho" },
  "servicio": "consulta-general | vacunacion | desparasitacion | consulta-preventiva | control | basica",
  "fecha": "2026-11-05",
  "hora": "09:30",
  "recordatorios": ["correo", "sms"],
  "motivo": "",
  "observaciones": "",
  "estado": "programada | completada | cancelada",
  "creadaEn": "2026-10-27T10:00:00Z"
}
```

- **Obligatorios:** `propietario.nombre`, `propietario.correo`, `propietario.telefono`, `mascota.nombre`, `servicio`, `fecha`, `hora`.
- **Opcionales:** `raza`, `motivo`, `observaciones`, `recordatorios` (y `canal`, `especie`, `edad`, `sexo`; si no se envían, `canal` queda en `correo` y los demás en `null`).
- **Los asigna el servidor:** `id` (autoincremental, no se reutiliza), `estado` (inicia en `programada`) y `creadaEn`.

### Validaciones (servidor)

- `correo` con formato válido; `telefono` con 7 a 15 dígitos (se permiten espacios y `+`).
- `servicio`, `especie`, `sexo`, `canal` y `estado` dentro de los valores permitidos; `recordatorios` ∈ `correo`, `sms`.
- `fecha` en formato `YYYY-MM-DD`, fecha real del calendario y no anterior a hoy; `hora` entre `08:00` y `18:00`.
- `edad` entre 0 y 20.
- Conflicto de horario: no puede haber dos citas **no canceladas** con la misma fecha y hora. Una cita cancelada libera su horario.

### Formato único de errores (400 / 404 / 409)

```json
{ "error": "Datos inválidos", "detalles": [ { "campo": "correo", "mensaje": "Formato de correo no válido" } ] }
```

`detalles` solo aparece cuando aplica. Los nombres de campo son `propietario.nombre`, `correo`, `telefono`,
`canal`, `mascota.nombre`, `especie`, `raza`, `edad`, `sexo`, `servicio`, `fecha`, `hora`, `recordatorios`,
`motivo`, `observaciones` y `estado`. El 404 de una cita es `{ "error": "Cita no encontrada" }`.

## Probar con curl

```bash
# Listar (con filtros y paginación)
curl "http://localhost:3000/api/citas?estado=programada&limit=5"

# Consultar una
curl http://localhost:3000/api/citas/1

# Crear (ajusta la fecha: no puede ser anterior a hoy)
curl -i -X POST http://localhost:3000/api/citas -H "Content-Type: application/json" -d '{
  "propietario": { "nombre": "Ana Pérez", "correo": "ana@ejemplo.com", "telefono": "300 123 4567", "canal": "whatsapp" },
  "mascota": { "nombre": "Nina", "especie": "gato", "raza": "Criollo", "edad": 2, "sexo": "hembra" },
  "servicio": "vacunacion", "fecha": "2026-12-15", "hora": "09:30",
  "recordatorios": ["correo", "sms"], "motivo": "Refuerzo anual"
}'

# Actualizar (reemplazo completo)
curl -X PUT http://localhost:3000/api/citas/1 -H "Content-Type: application/json" -d '{ ...cita completa... }'

# Eliminar
curl -i -X DELETE http://localhost:3000/api/citas/1
```

## Uso desde la página

- **Solicitar una cita** (`#form-citas`): valida los datos y hace `POST /api/citas`; muestra el éxito o los errores del servidor (incluido el 409 de horario ocupado).
- **Expediente de la mascota**: la tabla se llena con `GET /api/citas`.
  - **Ver** → `GET /api/citas/:id` y muestra el detalle.
  - **Editar** → carga la cita en el formulario y, al guardar, envía `PUT /api/citas/:id`.
  - **Eliminar** → pide confirmación, hace `DELETE /api/citas/:id` y recarga la lista.
- Si el servidor no responde, se muestra un aviso claro en el formulario o en la lista.
