from django.db.models.signals import post_delete, post_save, pre_save

from .utils import calcular_cambios, registrar_auditoria

# Guarda temporalmente el estado "antes" de un objeto entre pre_save y
# post_save, para poder calcular qué campos cambiaron.
_ESTADOS_PREVIOS = {}


def _obtener_valores(instance):
    return {field.name: getattr(instance, field.name) for field in instance._meta.fields}


def _pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            anterior = sender.objects.get(pk=instance.pk)
            _ESTADOS_PREVIOS[(sender, instance.pk)] = _obtener_valores(anterior)
        except sender.DoesNotExist:
            _ESTADOS_PREVIOS[(sender, instance.pk)] = None


def _post_save(sender, instance, created, **kwargs):
    nombre_modelo = sender.__name__

    if created:
        registrar_auditoria(
            accion='crear',
            modelo=nombre_modelo,
            objeto_id=instance.pk,
            objeto_repr=str(instance),
        )
        return

    anterior = _ESTADOS_PREVIOS.pop((sender, instance.pk), None)
    if anterior is not None:
        cambios = calcular_cambios(anterior, _obtener_valores(instance))
        if cambios:
            registrar_auditoria(
                accion='editar',
                modelo=nombre_modelo,
                objeto_id=instance.pk,
                objeto_repr=str(instance),
                cambios=cambios,
            )


def _post_delete(sender, instance, **kwargs):
    registrar_auditoria(
        accion='eliminar',
        modelo=sender.__name__,
        objeto_id=instance.pk,
        objeto_repr=str(instance),
    )


def conectar_auditoria(modelos):
    for modelo in modelos:
        pre_save.connect(_pre_save, sender=modelo, weak=False)
        post_save.connect(_post_save, sender=modelo, weak=False)
        post_delete.connect(_post_delete, sender=modelo, weak=False)