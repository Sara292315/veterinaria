"""Pruebas de integración API + base de datos y dobles de prueba.

- Fake: base de datos SQLite temporal en tmp_path (nunca citas.db real).
- Stub: reloj fijo inyectado en create_app (la fecha no depende del día).
- Mock: guardar_cita reemplazado para simular un fallo de SQLite.
- Spy: se espía app.logger.exception para verificar que se registró.
"""
import sqlite3
from datetime import date
from unittest.mock import patch

import pytest

from app import create_app, token_valido

HOY = date(2026, 10, 20)
CITA = {"nombre": "Ana Ruiz", "correo": "ana@mail.com",
        "telefono": "3001234567", "canal": "correo",
        "mascota-nombre": "Toby", "especie": "perro", "edad": "3",
        "sexo": "macho", "servicio": "vacunacion", "fecha": "2026-10-27",
        "hora": "10:30"}
TOKEN = "token-de-prueba"
AUTH = {"Authorization": f"Bearer {TOKEN}"}


def reloj_fijo():
    """Stub del reloj: siempre devuelve HOY."""
    return HOY


@pytest.fixture(name="app")
def fixture_app(tmp_path):
    """App aislada: BD temporal (fake), token y reloj (stub) inyectados."""
    return create_app(str(tmp_path / "test.db"), admin_token=TOKEN,
                      reloj=reloj_fijo)


@pytest.fixture(name="client")
def fixture_client(app):
    """Cliente HTTP de pruebas de Flask."""
    return app.test_client()


# --- I-01 flujo completo: POST válido -> 201 -> GET lo devuelve ------------
def test_crear_cita_devuelve_201_y_se_persiste(client):
    r = client.post("/api/citas", json=CITA)
    assert r.status_code == 201
    citas = client.get("/api/citas", headers=AUTH).get_json()
    assert len(citas) == 1 and citas[0]["mascota"] == "Toby"


def test_cita_invalida_devuelve_400_y_no_se_guarda(client):
    r = client.post("/api/citas", json={**CITA, "correo": "mal"})
    assert r.status_code == 400 and "correo" in r.get_json()["errores"]
    assert not client.get("/api/citas", headers=AUTH).get_json()


def test_el_reloj_inyectado_decide_que_es_pasado(client):
    r = client.post("/api/citas", json={**CITA, "fecha": "2026-10-19"})
    assert r.status_code == 400 and "fecha" in r.get_json()["errores"]


def test_cuerpo_que_no_es_json_devuelve_400(client):
    assert client.post("/api/citas", data="hola").status_code == 400


# --- ciclo TDD 2: tipos inesperados -> 400, nunca 500 ----------------------
@pytest.mark.parametrize("cuerpo", [[1, 2], "texto", 42])
def test_json_que_no_es_objeto_devuelve_400(client, cuerpo):
    assert client.post("/api/citas", json=cuerpo).status_code == 400


@pytest.mark.parametrize("campo,valor", [("nombre", 123),
                                         ("mascota-nombre", ["Toby"]),
                                         ("correo", {"x": 1})])
def test_campo_con_tipo_incorrecto_devuelve_400(client, campo, valor):
    r = client.post("/api/citas", json={**CITA, campo: valor})
    assert r.status_code == 400 and campo in r.get_json()["errores"]


# --- ciclo TDD 4: tamaño máximo del cuerpo ---------------------------------
def test_cuerpo_mayor_a_16_kb_devuelve_413(client):
    r = client.post("/api/citas", json={**CITA, "motivo": "x" * 20_000})
    assert r.status_code == 413


# --- intento de inyección SQL: se guarda como texto literal ----------------
def test_inyeccion_sql_se_guarda_como_texto(client):
    malicioso = "Robert'); DROP TABLE citas;--"
    assert client.post("/api/citas",
                       json={**CITA, "nombre": malicioso}).status_code == 201
    citas = client.get("/api/citas", headers=AUTH).get_json()
    assert citas[0]["nombre"] == malicioso


# --- mock + spy: fallo de la base de datos ---------------------------------
def test_error_de_base_de_datos_devuelve_500_y_se_registra(app, client):
    with patch("app.guardar_cita", side_effect=sqlite3.Error("disco lleno")), \
            patch.object(app.logger, "exception") as espia:
        r = client.post("/api/citas", json=CITA)
    assert r.status_code == 500 and "disco" not in r.get_data(as_text=True)
    espia.assert_called_once_with("Error al guardar la cita")


# --- ciclo TDD 3: listado protegido ----------------------------------------
@pytest.mark.parametrize("cabeceras", [{}, {"Authorization": "Bearer otro"},
                                       {"Authorization": TOKEN}])
def test_listar_citas_sin_token_valido_devuelve_401(client, cabeceras):
    assert client.get("/api/citas", headers=cabeceras).status_code == 401


def test_listar_citas_deshabilitado_si_no_hay_token(tmp_path):
    app = create_app(str(tmp_path / "t.db"), admin_token="")
    r = app.test_client().get("/api/citas", headers=AUTH)
    assert r.status_code == 403


def test_token_se_lee_de_variable_de_entorno(tmp_path, monkeypatch):
    monkeypatch.setenv("VET_ADMIN_TOKEN", "desde-env")
    app = create_app(str(tmp_path / "t.db"))
    r = app.test_client().get(
        "/api/citas", headers={"Authorization": "Bearer desde-env"})
    assert r.status_code == 200


@pytest.mark.parametrize("cabecera,esperado", [
    ("Bearer abc", True), ("Bearer abd", False), ("abc", False),
    (None, False), ("", False)])
def test_token_valido(cabecera, esperado):
    assert token_valido(cabecera, "abc") is esperado


# --- página y cabeceras de seguridad ---------------------------------------
def test_pagina_principal_se_sirve_con_cabeceras_de_seguridad(client):
    r = client.get("/")
    assert r.status_code == 200 and b"VetConnect" in r.data
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    r.close()
