"""Pruebas de la capa de datos con una BD temporal (nunca la real)."""
import sqlite3

import pytest

import database
from database import guardar_cita, init_db, listar_citas

CITA = {"nombre": " Ana Ruiz ", "correo": "ana@mail.com",
        "telefono": "3001234567", "canal": "correo",
        "mascota-nombre": "Toby", "especie": "perro", "edad": "3",
        "servicio": "vacunacion", "fecha": "2026-10-27", "hora": "10:30"}


@pytest.fixture(name="ruta")
def fixture_ruta(tmp_path):
    """BD vacía en un directorio temporal que pytest borra al terminar."""
    ruta = str(tmp_path / "d.db")
    init_db(ruta)
    return ruta


def test_guardar_y_listar(ruta):
    nuevo_id = guardar_cita(ruta, CITA)
    [fila] = listar_citas(ruta)
    assert fila["id"] == nuevo_id and fila["nombre"] == "Ana Ruiz"
    assert fila["edad"] == 3 and fila["raza"] == ""


def test_listar_ordena_por_fecha_y_hora(ruta):
    guardar_cita(ruta, {**CITA, "fecha": "2026-11-02"})
    guardar_cita(ruta, {**CITA, "fecha": "2026-10-28", "hora": "15:00"})
    guardar_cita(ruta, {**CITA, "fecha": "2026-10-28", "hora": "09:00"})
    horas = [(c["fecha"], c["hora"]) for c in listar_citas(ruta)]
    assert horas == sorted(horas)


def test_init_db_es_idempotente(ruta):
    init_db(ruta)
    assert not listar_citas(ruta)


def test_las_conexiones_siempre_se_cierran(ruta, monkeypatch):
    """Spy sobre sqlite3.connect: registra cada conexión abierta."""
    abiertas = []
    original = sqlite3.connect

    def connect_espia(*args, **kwargs):
        con = original(*args, **kwargs)
        abiertas.append(con)
        return con

    monkeypatch.setattr(database.sqlite3, "connect", connect_espia)
    guardar_cita(ruta, CITA)
    listar_citas(ruta)
    assert len(abiertas) == 2
    for con in abiertas:
        with pytest.raises(sqlite3.ProgrammingError):
            con.execute("SELECT 1")  # una conexión cerrada no se puede usar


def test_error_hace_rollback_y_cierra(ruta):
    with pytest.raises(sqlite3.IntegrityError):
        guardar_cita(ruta, {**CITA, "servicio": None})  # NOT NULL
    assert not listar_citas(ruta)
