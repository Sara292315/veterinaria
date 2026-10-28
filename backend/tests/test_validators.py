"""Pruebas unitarias de validators.py.

Caja negra: partición de equivalencia y valores límite (VL-*).
Caja blanca: un caso por camino independiente (CB-*) de validar_telefono.
"""
from datetime import date

import pytest

from validators import (validar_cita, validar_correo, validar_edad,
                        validar_fecha, validar_horario, validar_telefono)

HOY = date(2026, 10, 20)
VALIDA = {"nombre": "Ana Ruiz", "correo": "ana@mail.com",
          "telefono": "300 123 4567", "canal": "correo",
          "mascota-nombre": "Toby", "especie": "perro", "edad": "3",
          "servicio": "vacunacion", "fecha": "2026-10-25", "hora": "10:30"}


def corto(v):
    """Id legible para parámetros largos."""
    return str(v)[:15]


# --- U-01 correo ---------------------------------------------------------
@pytest.mark.parametrize("v,esperado", [
    ("a@b.co", True), (" a@b.co ", True), ("sin-arroba", False),
    ("a@b", False), ("a@b.co\nx", False), ("", False), (None, False),
    ({"x": 1}, False)])
def test_correo(v, esperado):
    assert validar_correo(v) is esperado


# --- U-02 teléfono (caja negra) -------------------------------------------
@pytest.mark.parametrize("v,esperado", [
    ("3001234567", True), ("+57 300 1234", True), ("123", False),
    ("abc1234567", False), (None, False)])
def test_telefono(v, esperado):
    assert validar_telefono(v) is esperado


# --- U-03 ciclo TDD 1: el requisito exige de 7 a 15 DÍGITOS ---------------
@pytest.mark.parametrize("v", ["+++++++", "1 2 3 4", "       ", "+57 3"])
def test_telefono_sin_suficientes_digitos_es_invalido(v):
    assert validar_telefono(v) is False


@pytest.mark.parametrize("v", ["++573001234567", "٣٠٠١٢٣٤٥٦٧", 3001234567])
def test_telefono_solo_un_mas_y_digitos_ascii(v):
    assert validar_telefono(v) is False


# --- CB-1..CB-6 caminos independientes de validar_telefono ----------------
@pytest.mark.parametrize("camino,v,esperado", [
    ("CB-1", None, False),               # P1 verdadero: no es str
    ("CB-2", "abc1234", False),          # P2 falso, P3 verdadero: no dígitos
    ("CB-3", "3001234567", True),        # P2 falso, P3 falso, P4 y P5 ok
    ("CB-4", "+573001234567", True),     # P2 verdadero: quita el '+'
    ("CB-5", "123456", False),           # P4 falso: 6 dígitos
    ("CB-6", "1234567890123456", False),  # P5 falso: 16 dígitos
])
def test_caminos_basicos_validar_telefono(camino, v, esperado):
    assert validar_telefono(v) is esperado, camino


# --- U-04 / VL fecha --------------------------------------------------------
@pytest.mark.parametrize("v,esperado", [
    ("2026-10-20", True), ("2026-12-01", True), ("2026-10-19", False),
    ("20/10/2026", False), (None, False)])
def test_fecha_valores_limite(v, esperado):
    assert validar_fecha(v, HOY) is esperado


def test_fecha_usa_hoy_real_por_defecto():
    assert validar_fecha("2000-01-01") is False


# --- VL-5..VL-8 hora: [08:00, 18:00] ---------------------------------------
@pytest.mark.parametrize("caso,v,esperado", [
    ("VL-5", "07:59", False), ("VL-6", "08:00", True),
    ("VL-7", "18:00", True), ("VL-8", "18:01", False),
    ("PE-hora-formato", "25:00", False), ("PE-hora-tipo", None, False)])
def test_horario_valores_limite(caso, v, esperado):
    assert validar_horario(v) is esperado, caso


# --- VL-1..VL-4 edad: entero en [0, 20] ------------------------------------
@pytest.mark.parametrize("caso,v,esperado", [
    ("VL-1", "-1", False), ("VL-2", "0", True), ("VL-3", 20, True),
    ("VL-4", "21", False), ("PE-edad-texto", "x", False),
    ("PE-edad-decimal", "3.5", False), ("PE-edad-nulo", None, False)])
def test_edad_valores_limite(caso, v, esperado):
    assert validar_edad(v) is esperado, caso


# --- U-05 validar_cita -------------------------------------------------------
def test_cita_valida_no_tiene_errores():
    assert not validar_cita(VALIDA, HOY)


@pytest.mark.parametrize("campo,valor", [
    ("nombre", "Al"), ("correo", "x"), ("telefono", "1"),
    ("canal", "paloma"), ("mascota-nombre", " "), ("especie", "dragon"),
    ("edad", "99"), ("servicio", ""), ("fecha", "2020-01-01"),
    ("hora", "23:00")])
def test_cada_campo_invalido_se_reporta(campo, valor):
    errores = validar_cita({**VALIDA, campo: valor}, HOY)
    assert list(errores) == [campo]


def test_cita_vacia_reporta_todos_los_campos_obligatorios():
    assert len(validar_cita({}, HOY)) == 10


# --- U-06 ciclo TDD 4: longitudes y dominios cerrados -----------------------
@pytest.mark.parametrize("campo,valor", [
    ("nombre", "A" * 101), ("mascota-nombre", "T" * 51),
    ("raza", "r" * 61), ("motivo", "m" * 501),
    ("observaciones", "o" * 501), ("sexo", "dragon"), ("raza", 7)],
    ids=corto)
def test_campo_demasiado_largo_o_fuera_de_dominio(campo, valor):
    assert list(validar_cita({**VALIDA, campo: valor}, HOY)) == [campo]


@pytest.mark.parametrize("campo,valor", [
    ("nombre", "A" * 100), ("mascota-nombre", "T" * 50),
    ("raza", "r" * 60), ("motivo", "m" * 500),
    ("observaciones", "o" * 500), ("sexo", "hembra"), ("raza", "")],
    ids=corto)
def test_campo_en_el_limite_es_valido(campo, valor):
    assert not validar_cita({**VALIDA, campo: valor}, HOY)


@pytest.mark.parametrize("campo,valor", [("nombre", 123),
                                         ("mascota-nombre", ["Toby"])])
def test_campo_de_tipo_incorrecto_no_lanza_excepcion(campo, valor):
    assert list(validar_cita({**VALIDA, campo: valor}, HOY)) == [campo]
