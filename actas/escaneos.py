"""Validación del contenido de los escaneos de actas.

Nunca se confía en la extensión ni en el tipo que declara el navegador: se
inspeccionan los primeros bytes (firma del formato) y, en imágenes, se
comprueba con Pillow que realmente se puedan abrir.
"""
import hashlib
import os
import re
import threading
import unicodedata
import warnings
from contextlib import contextmanager
from dataclasses import dataclass

from django.conf import settings
from PIL import Image, ImageFile, UnidentifiedImageError

MAX_PIXELES = 100_000_000  # ~100 megapíxeles; evita "bombas de descompresión"
MAX_NOMBRE = 150

# tipo detectado -> (content-type, extensión real, extensiones aceptables en el nombre)
FORMATOS = {
    'pdf': ('application/pdf', '.pdf', {'.pdf'}),
    'jpeg': ('image/jpeg', '.jpg', {'.jpg', '.jpeg', '.jpe', '.jfif'}),
    'png': ('image/png', '.png', {'.png'}),
}
FORMATO_PILLOW = {'jpeg': 'JPEG', 'png': 'PNG'}


class ArchivoInvalido(Exception):
    """El archivo no cumple las reglas; el mensaje es apto para mostrar al usuario."""


@dataclass
class InfoArchivo:
    nombre: str          # nombre para mostrar/descargar (limpio, con la extensión real)
    tipo_contenido: str  # application/pdf | image/jpeg | image/png
    extension: str       # .pdf | .jpg | .png
    tamano: int
    sha256: str


def limpiar_nombre(nombre):
    """Nombre seguro para mostrar: sin rutas, sin caracteres de control ni reservados."""
    nombre = os.path.basename((nombre or '').replace('\\', '/'))
    nombre = unicodedata.normalize('NFC', nombre)
    nombre = ''.join(c for c in nombre if c.isprintable() and c not in '<>:"|?*')
    nombre = re.sub(r'\s+', ' ', nombre).strip(' .')
    return nombre[:MAX_NOMBRE] or 'escaneo'


def _detectar(cabecera):
    if cabecera.startswith(b'%PDF-'):
        return 'pdf'
    if cabecera.startswith(b'\xff\xd8\xff'):
        return 'jpeg'
    if cabecera.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png'
    return None


_BLOQUEO_PILLOW = threading.Lock()


@contextmanager
def _lectura_estricta():
    """WeasyPrint (que usa esta app para los PDF) activa de forma GLOBAL
    ``ImageFile.LOAD_TRUNCATED_IMAGES = True`` al importarse, y con eso Pillow acepta
    en silencio un JPEG cortado rellenándolo de gris. Para validar escaneos exigimos
    lectura estricta, solo durante la comprobación, y dejamos el valor como estaba."""
    with _BLOQUEO_PILLOW:
        anterior = ImageFile.LOAD_TRUNCATED_IMAGES
        ImageFile.LOAD_TRUNCATED_IMAGES = False
        try:
            yield
        finally:
            ImageFile.LOAD_TRUNCATED_IMAGES = anterior


def _verificar_imagen(archivo, tipo):
    archivo.seek(0)
    try:
        with _lectura_estricta(), warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(archivo) as img:
                if img.format != FORMATO_PILLOW[tipo]:
                    raise ArchivoInvalido('La imagen no coincide con el formato que indica su contenido.')
                ancho, alto = img.size
                if ancho < 1 or alto < 1 or ancho * alto > MAX_PIXELES:
                    raise ArchivoInvalido(
                        f'La imagen es demasiado grande ({ancho}×{alto} px). Reduce su resolución e inténtalo de nuevo.'
                    )
                if tipo == 'png':
                    img.verify()  # recorre y comprueba todos los bloques (CRC)
                else:
                    # Decodifica a 1/8 de tamaño: detecta JPEG truncados sin gastar memoria.
                    img.draft('RGB', (max(1, ancho // 8), max(1, alto // 8)))
                    img.load()
    except ArchivoInvalido:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning,
            OSError, SyntaxError, ValueError, EOFError):
        raise ArchivoInvalido('La imagen está dañada o no se puede leer.')
    finally:
        archivo.seek(0)


def inspeccionar(archivo):
    """Valida un archivo subido y devuelve su información. Lanza ArchivoInvalido."""
    max_bytes = settings.ACTAS_ESCANEO_MAX_BYTES
    tamano = archivo.size

    if tamano == 0:
        raise ArchivoInvalido('El archivo está vacío.')
    if tamano > max_bytes:
        raise ArchivoInvalido(f'Supera el tamaño máximo de {max_bytes // (1024 * 1024)} MB.')

    archivo.seek(0)
    tipo = _detectar(archivo.read(16))
    if tipo is None:
        raise ArchivoInvalido('Formato no permitido. Solo se aceptan PDF, JPG o PNG.')

    if tipo == 'pdf':
        archivo.seek(max(0, tamano - 2048))
        if b'%%EOF' not in archivo.read():
            raise ArchivoInvalido('El PDF está incompleto o dañado.')
    else:
        _verificar_imagen(archivo, tipo)

    sha = hashlib.sha256()
    for bloque in archivo.chunks():
        sha.update(bloque)
    archivo.seek(0)

    tipo_contenido, extension, aceptadas = FORMATOS[tipo]
    nombre = limpiar_nombre(archivo.name)
    base, ext = os.path.splitext(nombre)
    if ext.lower() not in aceptadas:
        nombre = f'{base or "escaneo"}{extension}'  # el nombre refleja el formato real
    return InfoArchivo(nombre=nombre, tipo_contenido=tipo_contenido, extension=extension,
                       tamano=tamano, sha256=sha.hexdigest())
