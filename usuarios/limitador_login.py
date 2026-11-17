"""Bloqueo temporal de credenciales tras fallos de autenticación."""
import hashlib
import time

from django.core.cache import cache

MAX_INTENTOS_LOGIN = 5
VENTANA_INTENTOS_SEGUNDOS = 15 * 60
DURACION_BLOQUEO_SEGUNDOS = 15 * 60


def _claves(request):
    usuario = str(request.data.get('username', '')).strip().casefold()[:254]
    # Nginx reemplaza este encabezado con la IP real de conexión del cliente.
    ip = request.META.get('HTTP_X_REAL_IP') or request.META.get('REMOTE_ADDR', '')
    huella = hashlib.sha256(f'{usuario}\0{ip}'.encode('utf-8')).hexdigest()
    return f'login:intentos:{huella}', f'login:bloqueo:{huella}'


def bloqueo_restante(request):
    _, clave_bloqueo = _claves(request)
    vence = cache.get(clave_bloqueo)
    if vence is None:
        return 0
    return max(1, int(vence - time.time()))


def registrar_fallo_login(request):
    clave_intentos, clave_bloqueo = _claves(request)
    cache.add(clave_intentos, 0, timeout=VENTANA_INTENTOS_SEGUNDOS)
    intentos = cache.incr(clave_intentos)
    if intentos >= MAX_INTENTOS_LOGIN:
        vence = time.time() + DURACION_BLOQUEO_SEGUNDOS
        cache.set(clave_bloqueo, vence, timeout=DURACION_BLOQUEO_SEGUNDOS)


def limpiar_intentos_login(request):
    clave_intentos, clave_bloqueo = _claves(request)
    cache.delete_many([clave_intentos, clave_bloqueo])
