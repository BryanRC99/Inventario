from django.db.models import Q

from usuarios.alcance import es_admin, filtrar_por_empresas, ve_todo_en_sus_empresas


def actas_visibles(user, queryset):
    """Actas que el usuario puede ver (misma regla para listado, escaneos y dashboard)."""
    if es_admin(user):
        return queryset

    queryset = filtrar_por_empresas(user, queryset, 'activo__empresa')

    if user.rol == 'consulta':
        persona = getattr(user, 'persona_vinculada', None)
        if not persona:
            return queryset.none()
        return queryset.filter(persona=persona)

    if ve_todo_en_sus_empresas(user):
        return queryset

    q = Q(generado_por=user) | Q(activo__creado_por=user)
    if user.area_id:
        q |= Q(persona__area_id=user.area_id) | Q(activo__area_creador_id=user.area_id)
    return queryset.filter(q).distinct()
