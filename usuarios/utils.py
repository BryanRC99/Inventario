import secrets
import string


def generar_password_aleatoria(longitud=10):
    """
    Genera una contraseña aleatoria segura, fácil de leer y copiar
    (evita caracteres ambiguos como 0/O, 1/l/I).
    """
    alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    return ''.join(secrets.choice(alfabeto) for _ in range(longitud))