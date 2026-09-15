from .middleware import get_current_request, obtener_ip
from .models import RegistroAuditoria

# Nunca queremos auditar contraseñas ni campos que cambian solos sin
# intervención real del usuario.
CAMPOS_EXCLUIDOS = {'password', 'last_login'}


def _serializar_valor(valor):
    if valor is None:
        return None
    return str(valor)


def calcular_cambios(anterior: dict, nuevo: dict):
    cambios = {}
    for campo, valor_nuevo in nuevo.items():
        if campo in CAMPOS_EXCLUIDOS:
            continue
        valor_anterior = anterior.get(campo)
        if valor_anterior != valor_nuevo:
            cambios[campo] = {
                'antes': _serializar_valor(valor_anterior),
                'despues': _serializar_valor(valor_nuevo),
            }
    return cambios


def registrar_auditoria(accion, modelo='', objeto_id='', objeto_repr='', cambios=None, usuario=None):
    request = get_current_request()

    if usuario is None and request is not None: 
        usuario = request.user if request.user.is_authenticated else None

    ip = obtener_ip(request) if request else None
    user_agent = request.META.get('HTTP_USER_AGENT', '')[:255] if request else ''

    RegistroAuditoria.objects.create(
        usuario=usuario,
        usuario_username=usuario.username if usuario else '',
        accion=accion,
        modelo=modelo,
        objeto_id=str(objeto_id),
        objeto_repr=objeto_repr[:255],
        cambios=cambios,
        ip_address=ip,
        user_agent=user_agent,
    )