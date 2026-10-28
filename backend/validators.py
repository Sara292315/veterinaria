"""Reglas de validación de una solicitud de cita.

Son funciones puras (no tocan red ni base de datos), por eso se prueban
de forma aislada. Los límites viven en constantes con nombre.
"""
import re
from datetime import date, datetime, time

ESPECIES = {"perro", "gato", "ave", "otro"}
CANALES = {"correo", "telefono", "whatsapp"}
SERVICIOS = {"consulta-general", "vacunacion", "desparasitacion",
             "consulta-preventiva", "control", "basica"}
HORA_APERTURA, HORA_CIERRE = time(8, 0), time(18, 0)
TELEFONO_MIN_DIGITOS, TELEFONO_MAX_DIGITOS = 7, 15
SEXOS = {"hembra", "macho"}
NOMBRE_MIN_CARACTERES, NOMBRE_MAX_CARACTERES = 3, 100
MASCOTA_MAX_CARACTERES, RAZA_MAX_CARACTERES = 50, 60
TEXTO_LIBRE_MAX_CARACTERES = 500
EDAD_MINIMA, EDAD_MAXIMA = 0, 20

_EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
_SOLO_DIGITOS = re.compile(r"[0-9]+")


def _texto(valor):
    """Devuelve el texto sin espacios extremos; '' si no es una cadena."""
    return valor.strip() if isinstance(valor, str) else ""


def validar_correo(valor):
    """El correo debe tener la forma usuario@dominio.ext."""
    return bool(_EMAIL.fullmatch(_texto(valor)))


def validar_telefono(valor):
    """Admite espacios y un '+' inicial; exige de 7 a 15 dígitos."""
    if not isinstance(valor, str):
        return False
    numero = valor.replace(" ", "")
    if numero.startswith("+"):
        numero = numero[1:]
    if not _SOLO_DIGITOS.fullmatch(numero):
        return False
    return TELEFONO_MIN_DIGITOS <= len(numero) <= TELEFONO_MAX_DIGITOS


def validar_fecha(valor, hoy=None):
    """La fecha debe ser ISO (AAAA-MM-DD) y no estar en el pasado."""
    hoy = hoy or date.today()
    try:
        return date.fromisoformat(valor) >= hoy
    except (TypeError, ValueError):
        return False


def validar_horario(valor):
    """La hora (HH:MM) debe estar entre la apertura y el cierre."""
    try:
        hora = datetime.strptime(valor, "%H:%M").time()
    except (TypeError, ValueError):
        return False
    return HORA_APERTURA <= hora <= HORA_CIERRE


def validar_edad(valor):
    """La edad es un entero entre EDAD_MINIMA y EDAD_MAXIMA años."""
    try:
        return EDAD_MINIMA <= int(valor) <= EDAD_MAXIMA
    except (TypeError, ValueError):
        return False


def _longitud_entre(minimo, maximo):
    """Regla: texto obligatorio con longitud (sin espacios) en [min, max]."""
    return lambda valor: minimo <= len(_texto(valor)) <= maximo


def _opcional(regla):
    """Regla: el campo puede faltar (None); si viene, debe cumplir regla."""
    return lambda valor: valor is None or regla(valor)


def _en(opciones):
    """Regla: el valor debe pertenecer al conjunto cerrado de opciones."""
    return lambda valor: valor in opciones


def _texto_hasta(maximo):
    """Regla: cadena (puede ser vacía) de como máximo `maximo` caracteres."""
    return lambda valor: isinstance(valor, str) and len(valor) <= maximo


# (campo, regla, mensaje). El orden es el orden en que se reportan.
REGLAS = (
    ("nombre", _longitud_entre(NOMBRE_MIN_CARACTERES, NOMBRE_MAX_CARACTERES),
     f"El nombre debe tener entre {NOMBRE_MIN_CARACTERES} y "
     f"{NOMBRE_MAX_CARACTERES} caracteres."),
    ("correo", validar_correo, "Correo electrónico no válido."),
    ("telefono", validar_telefono,
     f"El teléfono debe tener entre {TELEFONO_MIN_DIGITOS} y "
     f"{TELEFONO_MAX_DIGITOS} dígitos."),
    ("canal", _en(CANALES), "Canal de contacto no válido."),
    ("mascota-nombre", _longitud_entre(1, MASCOTA_MAX_CARACTERES),
     "Indica el nombre de la mascota "
     f"(máximo {MASCOTA_MAX_CARACTERES} caracteres)."),
    ("especie", _en(ESPECIES), "Especie no válida."),
    ("raza", _opcional(_texto_hasta(RAZA_MAX_CARACTERES)),
     f"La raza admite máximo {RAZA_MAX_CARACTERES} caracteres."),
    ("sexo", _opcional(_en(SEXOS)), "Sexo no válido."),
    ("edad", validar_edad,
     f"La edad debe estar entre {EDAD_MINIMA} y {EDAD_MAXIMA} años."),
    ("servicio", _en(SERVICIOS), "Selecciona un servicio."),
    ("motivo", _opcional(_texto_hasta(TEXTO_LIBRE_MAX_CARACTERES)),
     f"El motivo admite máximo {TEXTO_LIBRE_MAX_CARACTERES} caracteres."),
    ("observaciones", _opcional(_texto_hasta(TEXTO_LIBRE_MAX_CARACTERES)),
     "Las observaciones admiten máximo "
     f"{TEXTO_LIBRE_MAX_CARACTERES} caracteres."),
    ("hora", validar_horario,
     f"El horario de atención es de {HORA_APERTURA.hour}:00 "
     f"a {HORA_CIERRE.hour}:00."),
)
MENSAJE_FECHA = "La fecha no puede estar en el pasado."


def validar_cita(datos, hoy=None):
    """Devuelve un dict {campo: mensaje}; vacío si la cita es válida."""
    errores = {campo: mensaje for campo, regla, mensaje in REGLAS
               if not regla(datos.get(campo))}
    if not validar_fecha(datos.get("fecha"), hoy):
        errores["fecha"] = MENSAJE_FECHA
    return errores
