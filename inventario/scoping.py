from django.db.models import Q


def activos_visibles(user, queryset):
    if user.is_superuser or user.rol == 'admin':
        return queryset

    if user.empresa_id:
        queryset = queryset.filter(empresa_id=user.empresa_id)
    else:
        queryset = queryset.filter(empresa__isnull=True)

    if user.rol == 'consulta':
        persona = getattr(user, 'persona_vinculada', None)
        if not persona:
            return queryset.none()
        return queryset.filter(
            custodias__persona=persona, custodias__fecha_fin__isnull=True
        ).distinct()

    q = Q(creado_por=user)
    if user.area_id:
        q |= (
            Q(area_creador_id=user.area_id)
            | Q(custodias__area_id=user.area_id)
            | Q(custodias__persona__area_id=user.area_id)
        )
    return queryset.filter(q).distinct()