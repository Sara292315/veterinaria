"""API de VetConnect: recibe, valida y guarda solicitudes de cita."""
import hmac
import os
import sqlite3
from datetime import date

from flask import Flask, jsonify, request

from database import guardar_cita, init_db, listar_citas
from validators import validar_cita

FRONTEND = os.path.join(os.path.dirname(__file__), "..", "frontend")
MAX_CUERPO_BYTES = 16 * 1024  # una cita real ocupa menos de 3 KB
CABECERAS_SEGURIDAD = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
}


def token_valido(cabecera, token):
    """True si la cabecera es 'Bearer <token>' (comparación en tiempo
    constante para no filtrar el token por diferencias de tiempo)."""
    return hmac.compare_digest(cabecera or "", f"Bearer {token}")


def create_app(db_path=None, admin_token=None, reloj=date.today):
    """Fábrica de la aplicación.

    Las dependencias externas (ruta de la BD, token y reloj) se inyectan
    para que las pruebas usen una BD temporal y una fecha fija.
    """
    app = Flask(__name__, static_folder=FRONTEND, static_url_path="")
    app.config["MAX_CONTENT_LENGTH"] = MAX_CUERPO_BYTES
    app.config["DB_PATH"] = db_path or os.environ.get("VET_DB", "citas.db")
    if admin_token is None:
        admin_token = os.environ.get("VET_ADMIN_TOKEN", "")
    app.config["ADMIN_TOKEN"] = admin_token
    init_db(app.config["DB_PATH"])

    @app.after_request
    def agregar_cabeceras(respuesta):
        respuesta.headers.update(CABECERAS_SEGURIDAD)
        return respuesta

    @app.get("/")
    def index():
        return app.send_static_file("index.html")

    @app.post("/api/citas")
    def crear_cita():
        datos = request.get_json(silent=True)
        if not isinstance(datos, dict):
            return jsonify(
                errores={"cuerpo": "Se esperaba un objeto JSON."}), 400
        errores = validar_cita(datos, reloj())
        if errores:
            return jsonify(errores=errores), 400
        try:
            cita_id = guardar_cita(app.config["DB_PATH"], datos)
        except sqlite3.Error:
            app.logger.exception("Error al guardar la cita")
            return jsonify(error="No se pudo guardar la cita."), 500
        return jsonify(id=cita_id), 201

    @app.get("/api/citas")
    def obtener_citas():
        token = app.config["ADMIN_TOKEN"]
        if not token:
            return jsonify(error="Listado deshabilitado."), 403
        if not token_valido(request.headers.get("Authorization"), token):
            return jsonify(error="No autorizado."), 401
        return jsonify(listar_citas(app.config["DB_PATH"]))

    return app


if __name__ == "__main__":
    # El depurador de Werkzeug permite ejecutar código: solo si se pide.
    create_app().run(debug=os.environ.get("FLASK_DEBUG") == "1")
