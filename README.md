# VetConnect (proyecto académico — Codificación y Pruebas del Software)

[![CI](https://github.com/Sara292315/veterinaria/actions/workflows/ci.yml/badge.svg?branch=codificacion)](https://github.com/Sara292315/veterinaria/actions/workflows/ci.yml)

```bash
cd backend
pip install -r requirements.txt          # requirements-dev.txt para análisis estático y E2E
VET_ADMIN_TOKEN=secreto python app.py    # http://127.0.0.1:5000  (FLASK_DEBUG=1 para depurar)
pytest                                   # unitarias + integración, cobertura de ramas >= 95 %
pytest -m e2e --no-cov                   # sistema en Chromium (pip install playwright; playwright install chromium)
flake8 . && pylint app.py database.py validators.py && bandit -r . -x ./tests
cd .. && node --test frontend/tests/*.test.js   # validador del navegador
```

| Variable | Uso |
|---|---|
| `VET_DB` | Ruta del archivo SQLite (por defecto `citas.db`) |
| `VET_ADMIN_TOKEN` | Token Bearer para `GET /api/citas`; si no existe, el listado queda deshabilitado (403) |
| `FLASK_DEBUG` | `1` activa el depurador (nunca en producción) |

Documentación: `docs/plan_de_pruebas.md` (plan, trazabilidad), `docs/registro_fallos.md` (hallazgos y mantenimiento),
`docs/evidencias/` (salidas antes/después y ciclos TDD), `docs/MAPA_DEL_PROYECTO.md`.
