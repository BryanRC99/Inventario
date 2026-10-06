import unicodedata
from pathlib import Path

from django.conf import settings

EXTENSIONES_VALIDAS = ['.png', '.jpg', '.jpeg']

def _slug_simple(texto):
    texto = texto.strip().lower()
    texto = unicodedata.normalize('NFD', texto)
    texto = ''.join(c for c in texto if unicodedata.category(c) != 'Mn')
    return ''.join(c for c in texto if c.isalnum())


def logo_path_por_convencion(empresa):
    if not empresa:
        return None

    slug = _slug_simple(empresa.nombre)
    static_dir = Path(settings.BASE_DIR) / 'static'

    for extension in EXTENSIONES_VALIDAS:
        candidato = static_dir / f'logo_{slug}{extension}'
        if candidato.exists():
            return candidato

    return None