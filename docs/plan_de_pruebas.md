# Plan de pruebas mínimo — VetConnect (IEEE 829 / ISO/IEC/IEEE 29119-3)

## 1. Requisitos bajo prueba

| ID | Requisito |
|----|-----------|
| RF-01 | Registrar una solicitud de cita válida: se guarda en la BD y la API responde 201. |
| RF-02 | Validar los datos en cliente y servidor: correo con formato, teléfono de 7–15 dígitos, edad entera 0–20, hora 08:00–18:00, fecha no pasada, longitudes máximas y valores cerrados; responder 400 con un mensaje por campo. |
| RF-03 | Solo el personal autorizado (token Bearer) puede listar las citas. |
| RNF-01 | Robustez: un cuerpo inválido nunca produce 500; un fallo de la BD responde 500 sin filtrar detalles y queda registrado. |

## 2. Elementos del plan

| Elemento | Contenido |
|---|---|
| Alcance | Se prueban `validators.py`, `database.py`, `app.py`, `frontend/js/validators.js` y el flujo del formulario de citas. No se prueban las animaciones GSAP, el formulario de contacto ni el contenido estático. |
| Objetivos | Verificar RF-01…RF-03 y RNF-01; cobertura de sentencias y ramas ≥ 95 %; 0 hallazgos de bandit de severidad media/alta. |
| Niveles y enfoques | Unitarias (caja negra: partición y valores límite; caja blanca: caminos básicos), integración API+BD (caja gris), sistema E2E en navegador (caja negra). |
| Criterios de entrada | El código compila, `flake8`, `pylint ≥ 9.5`, `bandit -ll` y `xenon` pasan (etapa estática del CI). |
| Criterios de salida | 100 % de pruebas en verde, cobertura ≥ 95 % (ramas incluidas), 0 defectos críticos/altos abiertos. |
| Entorno y datos | Python 3.12, Flask 3, SQLite en `tmp_path` (BD temporal por prueba), Node 22, Chromium (Playwright). Datos semilla: `VALIDA`/`CITA` y reloj fijo `HOY = 2026-10-20`. |
| Riesgos | Divergencia entre validador JS y Python; dependencia de la fecha del sistema; CDN de GSAP no disponible en CI; falsos positivos del análisis estático. |

## 3. Matriz de trazabilidad

| Requisito | Casos de prueba | Resultado | Defecto asociado |
|---|---|---|---|
| RF-01 | I-01 `test_crear_cita_devuelve_201_y_se_persiste`, `test_guardar_y_listar`, S-01 E2E | Pasa | — |
| RF-02 | VL-1…VL-8, CB-1…CB-6, `test_cada_campo_invalido_se_reporta`, `test_campo_demasiado_largo…`, JS-01…JS-06, S-02 E2E | Pasa | H-07 teléfono `+++++++`, S-04 sin límites, S-05 sexo libre, H-08 fecha UTC (corregidos) |
| RF-03 | `test_listar_citas_sin_token_valido_devuelve_401`, `…deshabilitado_si_no_hay_token`, `test_token_valido` | Pasa | S-03 listado público (corregido) |
| RNF-01 | `test_json_que_no_es_objeto_devuelve_400`, `test_error_de_base_de_datos_devuelve_500_y_se_registra`, `test_las_conexiones_siempre_se_cierran` | Pasa | S-02 500 por tipo, S-06 conexiones abiertas (corregidos) |

## 4. Prueba de aceptación manual guiada (complementa S-01/S-02)

1. `cd backend && VET_ADMIN_TOKEN=secreto python app.py` y abrir http://127.0.0.1:5000/#citas
2. Llenar el formulario con teléfono `+++++++` → se ve «Revisa los siguientes campos» y el campo queda en rojo.
3. Corregir el teléfono a `300 123 4567` → «Solicitud enviada».
4. `curl http://127.0.0.1:5000/api/citas` → 401. Con `-H "Authorization: Bearer secreto"` → la cita aparece.
