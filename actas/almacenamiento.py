"""Almacenamiento privado para los escaneos de actas firmadas.

Diferencias con el MEDIA normal de Django:
  - vive en settings.PRIVATE_MEDIA_ROOT, fuera de MEDIA_ROOT;
  - NO tiene URL pública (``storage.url()`` lanza ValueError): los archivos solo
    salen por un endpoint que verifica sesión y permisos;
  - permisos de archivo restringidos (solo el usuario del servidor y su grupo).
"""
import os

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.core.signals import setting_changed
from django.dispatch import receiver
from django.utils.functional import cached_property


class AlmacenPrivado(FileSystemStorage):
    @cached_property
    def base_location(self):
        return str(settings.PRIVATE_MEDIA_ROOT)

    @cached_property
    def location(self):
        return os.path.abspath(self.base_location)

    @cached_property
    def base_url(self):
        return None  # sin URL pública

    @cached_property
    def file_permissions_mode(self):
        return 0o640

    @cached_property
    def directory_permissions_mode(self):
        return 0o750


almacen_privado = AlmacenPrivado()


@receiver(setting_changed)
def _reiniciar_almacen(*, setting, **kwargs):
    # Permite cambiar PRIVATE_MEDIA_ROOT en pruebas (override_settings).
    if setting == 'PRIVATE_MEDIA_ROOT':
        almacen_privado.__dict__.pop('base_location', None)
        almacen_privado.__dict__.pop('location', None)
