"""S-01 / S-02 Pruebas de sistema (aceptación) en un navegador real.

Levantan el servidor Flask con una BD temporal y manejan Chromium con
Playwright como lo haría una persona. Se ejecutan con:  pytest -m e2e
"""
import threading
from datetime import date, timedelta

import pytest
from werkzeug.serving import make_server

from app import create_app

sync_api = pytest.importorskip("playwright.sync_api")
pytestmark = pytest.mark.e2e
TOKEN = "e2e"


@pytest.fixture(name="servidor", scope="module")
def fixture_servidor(tmp_path_factory):
    """Servidor real en un hilo, puerto libre y BD temporal."""
    ruta = str(tmp_path_factory.mktemp("e2e") / "e2e.db")
    srv = make_server("127.0.0.1", 0, create_app(ruta, admin_token=TOKEN))
    hilo = threading.Thread(target=srv.serve_forever, daemon=True)
    hilo.start()
    yield f"http://127.0.0.1:{srv.server_port}"
    srv.shutdown()


@pytest.fixture(name="pagina")
def fixture_pagina(servidor):
    """Pestaña de Chromium sin cabeza abierta en la página principal."""
    with sync_api.sync_playwright() as p:
        navegador = p.chromium.launch()
        pagina = navegador.new_page()
        pagina.goto(servidor, wait_until="load")
        yield pagina
        navegador.close()


def llenar(pagina, **cambios):
    """Llena el formulario como un usuario; `cambios` sobrescribe valores."""
    valores = {"nombre": "Ana Ruiz", "correo": "ana@mail.com",
               "telefono": "300 123 4567", "mascota-nombre": "Toby",
               "fecha": (date.today() + timedelta(days=3)).isoformat(),
               "hora": "10:30", **cambios}
    for campo, valor in valores.items():
        pagina.fill(f"#{campo}", valor)
    pagina.select_option("#servicio", "vacunacion")


def test_s01_usuario_agenda_una_cita(pagina, servidor):
    llenar(pagina)
    pagina.click("#form-citas button[type=submit]")
    mensaje = pagina.locator("#citas-msg")
    sync_api.expect(mensaje).to_contain_text("Solicitud enviada")
    r = pagina.request.get(f"{servidor}/api/citas",
                           headers={"Authorization": f"Bearer {TOKEN}"})
    assert any(c["mascota"] == "Toby" for c in r.json())


def test_s02_errores_se_muestran_y_se_marcan(pagina):
    llenar(pagina, telefono="+++++++", correo="sin-arroba")
    pagina.click("#form-citas button[type=submit]")
    sync_api.expect(pagina.locator("#citas-msg")).to_contain_text(
        "Revisa los siguientes campos")
    assert pagina.get_attribute("#telefono", "aria-invalid") == "true"
    assert pagina.get_attribute("#correo", "aria-invalid") == "true"
