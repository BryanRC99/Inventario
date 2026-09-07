from django.db.models import Q


def custodias_visibles(user, queryset):
    if user.is_superuser or user.rol == 'admin':
        return queryset

    if user.rol == 'consulta':
        persona = getattr(user, 'persona_vinculada', None)
        if not persona:
            return queryset.none()
        return queryset.filter(persona=persona)

    return queryset.filter(
        Q(area=user.area) | Q(persona__area=user.area) | Q(activo__creado_por=user)
    ).distinct()