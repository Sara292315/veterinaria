# Mapa del proyecto VetConnect: qué se hizo, en qué archivo y en qué línea

> **Nota (entrega 2):** las secciones 3 a 5 describen la entrega 1 (commit `9b599a9`); los números
> de línea corresponden a ese commit. Los cambios de la entrega 2 (refactorización, seguridad, TDD,
> CI por etapas, pruebas E2E y del frontend) están en `docs/registro_fallos.md`,
> `docs/plan_de_pruebas.md` y `docs/evidencias/`. Estado actual: 104 pruebas Python + 6 de Node,
> cobertura de sentencias y ramas 100 %.

## 1. Estructura del proyecto

```
veterinaria/
├── frontend/                 ← la página web (ya existía; se modificó)
│   ├── index.html            MODIFICADO
│   ├── css/style.css         MODIFICADO
│   └── js/
│       ├── script.js         MODIFICADO
│       └── validators.js     NUEVO
├── backend/                  ← NUEVO: servidor y pruebas
│   ├── app.py                API Flask
│   ├── validators.py         reglas de validación
│   ├── database.py           base de datos SQLite
│   ├── requirements.txt      dependencias
│   ├── pytest.ini            configuración de pytest y cobertura
│   ├── .coveragerc           qué se excluye de la cobertura
│   └── tests/
│       ├── test_validators.py  pruebas unitarias
│       └── test_api.py         pruebas de integración
├── .github/workflows/ci.yml  ← NUEVO: integración continua
├── docs/
│   ├── registro_fallos.md    NUEVO: fallos y mantenimiento
│   └── MAPA_DEL_PROYECTO.md  este archivo
├── README.md                 NUEVO: cómo ejecutar
└── .gitignore                NUEVO
```

## 2. Cómo se conecta todo (flujo de una cita)

1. La persona llena el formulario (`index.html`) y pulsa **Enviar solicitud**.
2. `script.js` L22–42 recoge los datos y los valida con `validators.js` (validación en el navegador, respuesta inmediata).
3. Si hay errores, se muestran en el recuadro `#citas-msg` (L213 de `index.html`) y se marcan los campos con `aria-invalid`.
4. Si todo está bien, se envía con `fetch` a `POST /api/citas`.
5. `app.py` L21–32 **vuelve a validar** con `validators.py` (el servidor nunca debe confiar en el navegador) y, si es válida, la guarda con `database.py`.
6. El servidor responde `201` (guardada), `400` (datos inválidos) o `500` (falla de la base de datos) y `script.js` muestra el resultado.

## 3. Unidad 1: Codificación (Entregable 1)

### 3.1 `backend/validators.py` (NUEVO). Reglas de validación

Son **funciones puras** (no tocan la base de datos ni la web): reciben datos y devuelven un resultado. Por eso son fáciles de probar y de mantener.

| Líneas | Qué es | Qué hace |
|---|---|---|
| L5–9 | Constantes `ESPECIES`, `CANALES`, `SERVICIOS`, `HORA_APERTURA/CIERRE` | Valores permitidos en un solo lugar; si cambian, se edita aquí y no en cada función. |
| L11–12 | Expresiones regulares `_EMAIL`, `_TELEFONO` | Patrón del correo y del teléfono (7 a 15 dígitos, permite espacios y `+`). |
| L15–16 | `validar_correo()` | Comprueba el formato del correo (`algo@dominio.ext`); acepta `None` sin fallar. |
| L19–20 | `validar_telefono()` | Comprueba que el teléfono tenga entre 7 y 15 caracteres válidos. |
| L23–29 | `validar_fecha()` | La fecha debe ser ISO (AAAA-MM-DD) y no estar en el pasado. Recibe `hoy` como parámetro para poder probarla con una fecha fija. |
| L32–38 | `validar_horario()` | La hora debe estar entre 08:00 y 18:00 (ambas incluidas). |
| L41–45 | `validar_edad()` | La edad debe ser un entero entre 0 y 20. |
| L48–71 | `validar_cita()` | Valida **todos** los campos y devuelve un diccionario `campo → mensaje de error`. Vacío = cita válida. |

### 3.2 `backend/database.py` (NUEVO). Persistencia

| Líneas | Elemento | Qué hace |
|---|---|---|
| L4–5 | `CAMPOS` | Lista de columnas de la tabla `citas`. |
| L8–11 | `_conectar()` | Abre la conexión SQLite y permite leer filas como diccionarios. |
| L14–21 | `init_db()` | Crea la tabla `citas` si no existe (se puede llamar varias veces sin problema). |
| L24–33 | `guardar_cita()` | Inserta una cita con consulta **parametrizada** (`?`) para evitar inyección SQL; devuelve el `id`. |
| L36–38 | `listar_citas()` | Devuelve todas las citas ordenadas por fecha y hora. |

### 3.3 `backend/app.py` (NUEVO). API Flask

| Líneas | Elemento | Qué hace |
|---|---|---|
| L9 | `FRONTEND` | Ruta a la carpeta `frontend/` para servir la página desde Flask. |
| L12–38 | `create_app(db_path)` | **Fábrica de la aplicación**: recibe la ruta de la BD, así las pruebas usan una BD temporal (diseño para testeabilidad). |
| L17–19 | `GET /` | Entrega `index.html`. |
| L21–32 | `POST /api/citas` | Valida → `400` con errores; guarda → `201`; si SQLite falla → `500` con mensaje y registro del error (manejo de errores). |
| L34–36 | `GET /api/citas` | Lista las citas guardadas. |
| L41–42 | Arranque | `python app.py` inicia el servidor en modo desarrollo. |

### 3.4 `frontend/js/validators.js` (NUEVO). Validación en el navegador

Es el espejo de `validators.py`: da respuesta inmediata sin viajar al servidor. Se mantiene también la validación del servidor por seguridad.

| Líneas | Qué hace |
|---|---|
| L3–6 | Funciones `correo`, `telefono`, `fecha`, `horario`. |
| L8–18 | `validarCita(d)`: revisa los campos y devuelve el diccionario de errores. |
| L19 | Expone las funciones como objeto `Validators` (patrón módulo). |

### 3.5 `frontend/js/script.js` (MODIFICADO)

| Líneas | Qué se hizo | Antes → Ahora |
|---|---|---|
| L1–3 | Referencias al formulario y al recuadro de mensajes; **la fecha mínima del calendario es hoy**. | Nada → bloquea fechas pasadas desde el selector. |
| L5–15 | `mostrarMensaje()`: muestra el aviso verde o rojo. Usa `textContent` (no `innerHTML`) para evitar inyección de código. | Nuevo |
| L17–20 | `marcarCampos()`: pone `aria-invalid` en los campos con error (accesibilidad). | Nuevo |
| L22–42 | Manejador del envío: valida, hace `fetch`, interpreta `201`/`400`/`500` y captura el caso «servidor caído». | Un `alert()` de demostración → flujo real con manejo de errores |
| L43–46 | Formulario de contacto (sin cambios). | Igual |
| L47–49 | Muestra el valor de la edad (sin cambios). | Igual |
| L51–116 | Animaciones GSAP (preloader, hero, tarjetas). | **Sin cambios** |

### 3.6 `frontend/index.html` (MODIFICADO)

| Línea | Cambio | Por qué |
|---|---|---|
| L35 | Enlace «Calidad» en el menú. | Llegar a la nueva sección. |
| L116 | El formulario mantiene `novalidate`. | Es intencional: ahora la validación la hace `validators.js` con mensajes propios, no los globos del navegador. |
| L161 | `</o>` → `</output>`. | Corrección de HTML mal cerrado (fallo #2). |
| L213 | Recuadro `#citas-msg` con `role="alert"` y `aria-live`. | Los lectores de pantalla anuncian los errores (WCAG 2.1). |
| L334–352 | Sección «Calidad y pruebas del software» con el badge del CI. | Evidenciar los temas vistos en la propia página. |
| L380–381 | Carga de `validators.js` **antes** de `script.js`. | `script.js` usa `Validators`; el orden importa. |

### 3.7 `frontend/css/style.css` (MODIFICADO)

| Líneas | Qué se hizo |
|---|---|
| L379–385 | Estilos `.msg`, `.msg-ok`, `.msg-error`, `[aria-invalid]` y `code` de la sección de calidad. Se **añadieron al final**; el diseño original no se tocó. |

## 4. Unidad 2: Pruebas con xUnit / pytest (Entregable 2)

Se ejecutan con `cd backend && pytest`. Resultado: **47 pruebas, cobertura 99 %**.

### 4.1 `backend/tests/test_validators.py`: pruebas unitarias

Datos de apoyo: `HOY` (fecha fija para que la prueba no dependa del reloj) y `VALIDA` (cita correcta) en L7–10.

| Líneas | Prueba | Tipo | Qué demuestra |
|---|---|---|---|
| L13–16 | `test_correo` | Caja negra | Entradas válidas e inválidas del correo (incluye `None` y vacío). |
| L19–22 | `test_telefono` | Caja negra | Teléfonos válidos, muy cortos y con letras. |
| L25–28 | `test_fecha_valores_limite` | Caja negra · valores límite | Hoy sí, ayer no, formato incorrecto no. |
| L31–32 | `test_fecha_usa_hoy_real_por_defecto` | Caja blanca | Cubre la rama donde no se pasa `hoy` y se usa la fecha real. |
| L35–38 | `test_horario_valores_limite` | Caja negra · valores límite | 07:59 ✗, 08:00 ✓, 18:00 ✓, 18:01 ✗, hora inexistente ✗. |
| L41–44 | `test_edad` | Caja negra · valores límite | -1 ✗, 0 ✓, 20 ✓, 21 ✗, texto ✗. |
| L47–48 | `test_cita_valida_no_tiene_errores` | Caja negra | Una cita correcta devuelve diccionario vacío. |
| L51–57 | `test_cada_campo_invalido_se_reporta` | Caja blanca | Cada `if` de `validar_cita` se ejecuta: un campo malo produce exactamente un error. |
| L60–61 | `test_cita_vacia_reporta_todos_los_campos` | Caja blanca | Con datos vacíos se reportan los 10 campos. |

### 4.2 `backend/tests/test_api.py`: pruebas de integración y dobles de prueba

Datos de apoyo: `FUTURA` (fecha dentro de 7 días) y `CITA` (cita completa) en L9–12.

| Líneas | Prueba | Tipo | Qué demuestra |
|---|---|---|---|
| L15–18 | `client` | Fixture | Crea una app con **base de datos temporal** (`tmp_path`) para cada prueba: las pruebas no se contaminan entre sí. |
| L21–25 | `test_crear_cita_devuelve_201_y_se_persiste` | Integración API + BD | Se responde 201 y la cita queda guardada. |
| L28–31 | `test_cita_invalida_devuelve_400_con_errores` | Integración | Datos malos → 400 con el campo con error, y **no** se guarda nada. |
| L34–35 | `test_cuerpo_que_no_es_json_devuelve_400` | Integración · robustez | Un cuerpo que no es JSON no rompe el servidor. |
| L38–41 | `test_error_de_base_de_datos_devuelve_500` | **Doble de prueba (mock)** | `patch` simula un `sqlite3.Error` y comprueba que se responde 500 con mensaje. |
| L44–47 | `test_pagina_principal_se_sirve` | Sistema (básica) | `GET /` entrega la página de VetConnect. |
| L50–54 | `test_capa_de_datos_guardar_y_listar` | Pruebas con base de datos | `guardar_cita` y `listar_citas` funcionan juntas. |

### 4.3 Configuración de pruebas y cobertura

| Archivo | Líneas | Qué hace |
|---|---|---|
| `backend/pytest.ini` | L1–4 | Ubica las pruebas, añade la carpeta al *path* y activa el reporte de cobertura (terminal + HTML). |
| `backend/.coveragerc` | L1–2 | Excluye `tests/` para que la cobertura mida solo el código real. |
| `backend/requirements.txt` | L1–3 | Flask, pytest y pytest-cov. |

## 5. Unidad 3: Integración continua (Entregable 3)

`.github/workflows/ci.yml`: GitHub ejecuta las pruebas automáticamente en cada `push` y `pull request`.

| Líneas | Qué hace |
|---|---|
| L2 | Se activa con cada `push` y `pull request`. |
| L8 | Todos los comandos se ejecutan dentro de `backend/`. |
| L10 | Descarga el código del repositorio. |
| L11–15 | Instala Python 3.12 (con caché de dependencias). |
| L16 | Instala las dependencias. |
| L17–18 | Corre `pytest` y **falla si la cobertura es menor al 90 %**. |
| L19–23 | Guarda el reporte de cobertura HTML como artefacto descargable (se sube aunque fallen las pruebas). |

## 6. Documentación y mantenimiento

| Archivo | Líneas | Contenido |
|---|---|---|
| `docs/registro_fallos.md` | L5–9 | Tabla de 5 fallos detectados con su tipo (correctivo, evolutivo, preventivo) y su corrección. |
| `docs/registro_fallos.md` | L11–13 | Plan de mantenimiento correctivo y evolutivo. |
| `README.md` | L1–11 | Comandos para ejecutar la app y las pruebas. |
| `.gitignore` | L1–5 | Evita subir `__pycache__`, bases de datos y reportes de cobertura. |

### Fallos del proyecto original y dónde se corrigieron

| # | Fallo | Dónde se corrigió |
|---|---|---|
| 1 | El formulario no validaba nada | `validators.js` L8–18, `validators.py` L48–71, `script.js` L22–42 |
| 2 | `</o>` mal cerrado | `index.html` L161 |
| 3 | El envío solo mostraba un `alert()` | `script.js` L22–42 (`fetch`) y `app.py` L21–32 |
| 4 | Se aceptaban fechas pasadas y horas fuera de horario | `validar_fecha` L23–29, `validar_horario` L32–38 y `script.js` L3 |
| 5 | Sin pruebas ni CI | `backend/tests/` y `.github/workflows/ci.yml` |

## 7. Tema del microcurrículo → dónde se evidencia

| Tema visto | Dónde se aplica |
|---|---|
| Principios de programación: legibilidad, modularidad, mantenibilidad | Código separado en `validators`, `database` y `app`; funciones cortas con una sola responsabilidad. |
| Codificación defensiva y validación de entradas | `validators.py`, `validators.js`; manejo de errores en `app.py` L21–32. |
| Seguridad en la codificación | Consultas parametrizadas en `database.py` L24–33; `textContent` en `script.js` L5–15. |
| Mantenimiento y trazabilidad de errores | `docs/registro_fallos.md`. |
| Pruebas de caja negra y blanca | `test_validators.py` L1–61. |
| Pruebas unitarias y de integración | `test_validators.py` (unitarias) y `test_api.py` L1–54 (integración). |
| Dobles de prueba (mocks) | `test_error_de_base_de_datos_devuelve_500` L38–41. |
| Pruebas con base de datos | Fixture `client` L15–18 y `test_capa_de_datos_guardar_y_listar` L50–54. |
| Diseño para testeabilidad | `create_app(db_path)` L12–38 y el parámetro `hoy` en `validar_fecha` L23–29. |
| Cobertura de pruebas | `pytest.ini`, `.coveragerc` y el umbral del 90 %% en `ci.yml`. |
| Integración continua con GitHub Actions | `.github/workflows/ci.yml`. |
| Control de versiones con Git | Repositorio en GitHub, `.gitignore`. |
| Accesibilidad (WCAG 2.1, competencia intercultural) | `role="alert"` y `aria-live` en `index.html` L213; `aria-invalid` en `script.js`. |

## 8. Cómo ejecutar

```bash
cd backend
pip install -r requirements.txt
python app.py   # abre http://127.0.0.1:5000
pytest           # pruebas + cobertura (reporte en backend/htmlcov/index.html)
```
