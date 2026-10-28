"""Capa de persistencia (SQLite)."""
import sqlite3
from contextlib import contextmanager

# Columna de la tabla -> clave del JSON recibido (solo difiere "mascota").
COLUMNAS = {
    "nombre": "nombre", "correo": "correo", "telefono": "telefono",
    "canal": "canal", "mascota": "mascota-nombre", "especie": "especie",
    "raza": "raza", "edad": "edad", "sexo": "sexo", "servicio": "servicio",
    "fecha": "fecha", "hora": "hora", "motivo": "motivo",
    "observaciones": "observaciones",
}
CAMPOS = tuple(COLUMNAS)

SQL_CREAR = """CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL, correo TEXT NOT NULL, telefono TEXT NOT NULL,
    canal TEXT, mascota TEXT NOT NULL, especie TEXT, raza TEXT,
    edad INTEGER, sexo TEXT, servicio TEXT NOT NULL, fecha TEXT NOT NULL,
    hora TEXT NOT NULL, motivo TEXT, observaciones TEXT)"""

# Consulta fija y parametrizada: ningún dato del usuario forma parte del SQL.
SQL_INSERTAR = """INSERT INTO citas (nombre, correo, telefono, canal,
    mascota, especie, raza, edad, sexo, servicio, fecha, hora, motivo,
    observaciones) VALUES (:nombre, :correo, :telefono, :canal, :mascota,
    :especie, :raza, :edad, :sexo, :servicio, :fecha, :hora, :motivo,
    :observaciones)"""

SQL_LISTAR = "SELECT * FROM citas ORDER BY fecha, hora"


@contextmanager
def _conexion(ruta):
    """Abre una conexión, confirma la transacción y SIEMPRE la cierra."""
    con = sqlite3.connect(ruta)
    con.row_factory = sqlite3.Row
    try:
        with con:  # commit si todo va bien, rollback si hay excepción
            yield con
    finally:
        con.close()


def init_db(ruta):
    """Crea la tabla citas si no existe (idempotente)."""
    with _conexion(ruta) as con:
        con.execute(SQL_CREAR)


def _a_fila(datos):
    """Convierte la cita validada en los parámetros del INSERT."""
    fila = {col: datos.get(clave) for col, clave in COLUMNAS.items()}
    for col in ("nombre", "correo", "telefono", "mascota"):
        fila[col] = fila[col].strip()
    for col in ("raza", "motivo", "observaciones"):
        fila[col] = fila[col] or ""
    fila["edad"] = int(fila["edad"])
    return fila


def guardar_cita(ruta, datos):
    """Inserta una cita ya validada y devuelve su id."""
    with _conexion(ruta) as con:
        return con.execute(SQL_INSERTAR, _a_fila(datos)).lastrowid


def listar_citas(ruta):
    """Devuelve todas las citas ordenadas por fecha y hora."""
    with _conexion(ruta) as con:
        return [dict(fila) for fila in con.execute(SQL_LISTAR)]
