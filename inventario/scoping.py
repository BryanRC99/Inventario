from django.db.models import Q


def activos_visibles(user, queryset):
    if user.is_superuser or user.rol == 'admin':
        return queryset

    if user.rol == 'consulta':
        persona = getattr(user, 'persona_vinculada', None)
        if not persona:
            return queryset.none()
        return queryset.filter(custodias__persona=persona).distinct()

    return queryset.filter(
        Q(creado_por=user) | Q(custodias__area=user.area) | Q(custodias__persona__area=user.area)
    ).distinct()