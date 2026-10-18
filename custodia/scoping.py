from django.db.models import Q


def custodias_visibles(user, queryset):
    if user.is_superuser or user.rol == 'admin':
        return queryset

    if user.empresa_id:
        queryset = queryset.filter(activo__empresa_id=user.empresa_id)
    else:
        queryset = queryset.filter(activo__empresa__isnull=True)

    if user.rol == 'consulta':
        persona = getattr(user, 'persona_vinculada', None)
        if not persona:
            return queryset.none()
        return queryset.filter(persona=persona)

    q = Q(activo__creado_por=user)
    if user.area_id:
        q |= (
            Q(area_id=user.area_id)
            | Q(persona__area_id=user.area_id)
            | Q(activo__area_creador_id=user.area_id)
        )
    return queryset.filter(q).distinct()