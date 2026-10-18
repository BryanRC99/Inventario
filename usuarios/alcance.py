from rest_framework import serializers


def validar_acceso(user, activo=None, persona=None):
    from inventario.models import Activo
    from inventario.scoping import activos_visibles
    from personas.models import Persona
    from personas.scoping import personas_visibles

    errores = {}
    if activo and not activos_visibles(user, Activo.objects.all()).filter(pk=activo.pk).exists():
        errores['activo'] = 'No tienes acceso a este activo.'
    if persona and not personas_visibles(user, Persona.objects.all()).filter(pk=persona.pk).exists():
        errores['persona'] = 'No tienes acceso a esta persona.'
    if activo and persona and activo.empresa_id != persona.empresa_id:
        errores['persona'] = 'La persona y el activo pertenecen a empresas distintas.'
    if errores:
        raise serializers.ValidationError(errores)