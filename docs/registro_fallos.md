# Registro de fallos, hallazgos y mantenimiento

## 1. Fallos corregidos en la entrega 1 (commit 9b599a9)

| # | Fallo detectado | Tipo (ISO/IEC 14764) | Corrección aplicada |
|---|-----------------|------|---------------------|
| 1 | El formulario de citas usaba `novalidate` y no validaba nada | Correctivo | Validación en cliente (`validators.js`) y en servidor (`validators.py`) |
| 2 | `<output>` de la edad se cerraba con `</o>` | Correctivo | Etiqueta cerrada como `</output>` |
| 3 | El envío solo mostraba un `alert()`: la cita no se guardaba | Perfectivo | API Flask + SQLite (`POST /api/citas`) |
| 4 | Se permitían fechas pasadas y horas fuera de 8:00–18:00 | Correctivo | `validar_fecha` y `validar_horario` |
| 5 | Sin pruebas ni integración continua | Preventivo | pytest + GitHub Actions |

## 2. Hallazgos de calidad (entrega 2, línea base b9350b9)

| ID | Ubicación (antes) | Hallazgo | Principio | Sev. | Corrección (commit) |
|----|-------------------|----------|-----------|------|---------------------|
| H-01 | validators.py:48-71 | `validar_cita` con 10 `if` encadenados, CC = 13 (C) | Funciones cortas, mantenibilidad | Media | Tabla `REGLAS`, CC = 4 (88f3724) |
| H-02 | validators.py:12, 43, 51, 56 | Números mágicos 3, 7, 15, 0, 20 repetidos en regex y mensajes | Número mágico, DRY | Baja | Constantes con nombre (076d363, 88f3724) |
| H-03 | validators.js:8-18 | El validador JS revisa 7 de 10 campos (sin canal, especie, edad): reglas duplicadas y divergentes | Duplicación, consistencia | Media | Paridad de reglas + 6 pruebas Node (a93d3f2) |
| H-04 | app.py:12, database.py:14/24/36, validators.py:15/19/41 | 7 funciones sin docstring (pylint C0116) | Comentarios útiles | Baja | Docstrings (88f3724, ca5c4ce, afc5894) |
| H-05 | database.py, tests/* | 23 advertencias PEP 8 (E501, E128) | Guía de estilo PEP 8 | Baja | Formato (afc5894, a8fcbd3) |
| H-06 | database.py:25-28 | Tupla posicional acoplada al orden de `CAMPOS` | Acoplamiento, legibilidad | Media | Diccionario `COLUMNAS` y parámetros con nombre (afc5894) |
| H-07 | validators.py:12 | Regex `[0-9 +]{7,15}` cuenta caracteres: acepta `+++++++` | Corrección funcional | Alta | Ciclo TDD 1 (870ea64 → b25ebab → 076d363) |
| H-08 | script.js:3, validators.js:5 | Fecha mínima con `toISOString()` (UTC): en Colombia después de las 19:00 rechaza el día de hoy | Corrección funcional | Media | `Validators.hoyISO()` local (a93d3f2) |

## 3. Hallazgos de seguridad

| ID | Punto de entrada | Riesgo | Corrección (commit) |
|----|------------------|--------|---------------------|
| S-01 | Arranque `app.run(debug=True)` | CWE-94 / CWE-489, bandit B201 (alta) | `FLASK_DEBUG=1` explícito (a8fcbd3) |
| S-02 | Cuerpo JSON y tipo de cada campo | CWE-20 / CWE-754: `[1,2]` o `nombre: 123` → 500 | Ciclo TDD 2 (ba04a33 → 0ae0b6f) |
| S-03 | `GET /api/citas` | CWE-200, OWASP A01:2021: datos personales sin autenticación | Token Bearer `VET_ADMIN_TOKEN` + `hmac.compare_digest` (c7390aa → 2d4195b) |
| S-04 | Campos de texto y tamaño del cuerpo | CWE-400 / CWE-770: sin límites | Ciclo TDD 4, `MAX_CONTENT_LENGTH` 16 KB (a28ef03 → 68b0378) |
| S-05 | Campo `sexo` | CWE-20: se guardaba cualquier texto (`<script>…`) | Dominio cerrado hembra/macho (68b0378) |
| S-06 | Conexión SQLite | CWE-772: conexiones sin cerrar (11 ResourceWarning) | `_conexion()` con `finally: close()` (afc5894) |
| S-07 | Respuestas HTTP | CWE-1021 / OWASP A05: sin cabeceras anti-clickjacking ni nosniff | `after_request` con cabeceras (a8fcbd3) |
| S-08 | INSERT con f-string | bandit B608 (media): **falso positivo**, solo interpola nombres de columna constantes | SQL fijo con parámetros con nombre (afc5894) |

Evidencia ejecutable: `docs/evidencias/seguridad_antes_despues.txt`.

## 4. Riesgos residuales (pendientes)
- Sin límite de peticiones por IP (CWE-799): un bot podría crear muchas citas. Propuesta: Flask-Limiter.
- El token de administración es estático; en producción debería existir inicio de sesión por usuario.

## 5. Mantenimiento propuesto
- Correctivo: la suite corre en cada push (CI) y bloquea regresiones.
- Preventivo: análisis estático (flake8, pylint, bandit, xenon) como etapa obligatoria del pipeline.
- Evolutivo: autenticación de propietarios, edición/cancelación de citas y expediente desde la BD.
