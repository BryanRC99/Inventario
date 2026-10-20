from django.db.models import Q

from usuarios.alcance import es_admin, filtrar_por_empresas, ve_todo_en_sus_empresas


def activos_visibles(user, queryset):
    if es_admin(user):
        return queryset

    queryset = filtrar_por_empresas(user, queryset, 'empresa')

    if user.rol == 'consulta':
        persona = getattr(user, 'persona_vinculada', None)
        if not persona:
            return queryset.none()
        return queryset.filter(
            custodias__persona=persona, custodias__fecha_fin__isnull=True
        ).distinct()

    if ve_todo_en_sus_empresas(user):
        return queryset

    q = Q(creado_por=user)
    if user.area_id:
        q |= (
            Q(area_creador_id=user.area_id)
            | Q(custodias__area_id=user.area_id)
            | Q(custodias__persona__area_id=user.area_id)
        )
    return queryset.filter(q).distinct()