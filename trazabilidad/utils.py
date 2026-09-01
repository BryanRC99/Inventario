from .models import Movimiento


def registrar_movimiento(
    activo,
    tipo_evento,
    usuario=None,
    ubicacion_origen=None,
    ubicacion_destino=None,
    observaciones='',
):
    """
    Punto único para crear un Movimiento desde cualquier parte del sistema
    (creación de activo, custodia, mantenimiento, etc.) sin repetir lógica.
    """
    return Movimiento.objects.create(
        activo=activo,
        tipo_evento=tipo_evento,
        usuario=usuario,
        ubicacion_origen=ubicacion_origen,
        ubicacion_destino=ubicacion_destino,
        observaciones=observaciones,
    )