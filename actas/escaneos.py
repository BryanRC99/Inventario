"""Validación y utilidades para los escaneos de actas firmadas."""
import hashlib
from io import BytesIO

from django.conf import settings
from PIL import Image, UnidentifiedImageError

MAX_PIXELES = 60_000_000  # protege contra imágenes "bomba" (poco peso, enormes al abrirse)
FORMATOS_IMAGEN = {'JPEG': 'image/jpeg', 'PNG': 'image/png'}
ACEPTADOS = 'PDF, JPG o PNG'


class ArchivoInvalido(Exception):
    pass


def analizar_archivo(archivo):
    """Valida el contenido REAL (no la extensión) y devuelve (tipo_contenido, tamano, sha256).
    Lanza ArchivoInvalido con un mensaje claro en español."""
    nombre = archivo.name
    max_bytes = settings.ACTA_ESCANEO_MAX_BYTES
    if archivo.size == 0:
        raise ArchivoInvalido(f'"{nombre}" está vacío.')
    if archivo.size > max_bytes:
        raise ArchivoInvalido(f'"{nombre}" pesa {archivo.size / 1048576:.1f} MB y el máximo permitido es {max_bytes // 1048576} MB.')

    archivo.seek(0)
    contenido = archivo.read()
    archivo.seek(0)
    sha = hashlib.sha256(contenido).hexdigest()

    if contenido.startswith(b'%PDF-'):
        if b'%%EOF' not in contenido[-2048:]:
            raise ArchivoInvalido(f'"{nombre}" es un PDF incompleto o dañado. Vuelva a escanearlo.')
        return 'application/pdf', len(contenido), sha

    try:
        with Image.open(BytesIO(contenido)) as img:
            formato = img.format
            ancho, alto = img.size
            if formato not in FORMATOS_IMAGEN:
                raise ArchivoInvalido(f'"{nombre}" no es un formato admitido. Use {ACEPTADOS}.')
            if ancho * alto > MAX_PIXELES:
                raise ArchivoInvalido(f'La imagen "{nombre}" es demasiado grande ({ancho}×{alto}). Reduzca su resolución.')
            img.verify()
    except ArchivoInvalido:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError):
        raise ArchivoInvalido(f'"{nombre}" no es un archivo válido o está dañado. Use {ACEPTADOS}.')
    return FORMATOS_IMAGEN[formato], len(contenido), sha


def sha256_de_archivo(campo_archivo, bloque=1024 * 1024):
    h = hashlib.sha256()
    with campo_archivo.open('rb') as f:
        for parte in iter(lambda: f.read(bloque), b''):
            h.update(parte)
    return h.hexdigest()
