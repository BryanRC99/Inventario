from rest_framework import serializers


def es_admin(user):
    return bool(user.is_superuser or user.rol == 'admin')


def empresas_ids(user):
    """IDs de las empresas que el usuario puede ver/gestionar.

    - Admin: no aplica (ve todo); devuelve None.
    - Consulta: solo su empresa principal (nunca varias).
    - Operador: su empresa principal + las adicionales.
    Lista vacía = el usuario no tiene empresa (solo ve registros sin empresa).
    """
    if es_admin(user):
        return None
    ids = set()
    if user.empresa_id:
        ids.add(user.empresa_id)
    if user.rol == 'operador':
        ids.update(user.empresas_adicionales.values_list('id', flat=True))
    return list(ids)


def filtrar_por_empresas(user, queryset, campo):
    """Única regla de aislamiento por empresa del sistema. `campo` es la ruta
    a la empresa, ej. 'empresa' o 'activo__empresa'."""
    ids = empresas_ids(user)
    if ids is None:
        return queryset
    if not ids:
        return queryset.filter(**{f'{campo}__isnull': True})
    return queryset.filter(**{f'{campo}__in': ids})


def ve_todo_en_sus_empresas(user):
    """Operador marcado para no limitarse por área/creador dentro de sus empresas."""
    return user.rol == 'operador' and user.sin_restriccion_area


def resolver_empresa_para_crear(user, elegida):
    """Empresa con la que se crea un registro nuevo (activo, persona).
    Admin: debe elegir. Operador: la elige entre las suyas; si solo tiene una se usa
    sin preguntar. Lanza ValidationError con mensaje claro si no es válida."""
    if es_admin(user):
        if not elegida:
            raise serializers.ValidationError({'empresa': ['Selecciona la empresa.']})
        return elegida

    from empresas.models import Empresa

    ids = empresas_ids(user)
    if not ids:
        raise serializers.ValidationError(
            {'empresa': ['Tu usuario no tiene una empresa asignada. Pide a un administrador que te asigne una.']}
        )
    if elegida is None:
        if len(ids) == 1:
            return Empresa.objects.get(pk=ids[0])
        raise serializers.ValidationError(
            {'empresa': ['Tienes acceso a varias empresas: selecciona a cuál pertenece este registro.']}
        )
    if elegida.pk not in ids:
        raise serializers.ValidationError(
            {'empresa': ['No tienes permiso para registrar datos en esa empresa.']}
        )
    return elegida


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