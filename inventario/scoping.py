from django.db.models import Q


def activos_visibles(user, queryset):
    if user.is_superuser or user.rol == 'admin':
        return queryset

    # Empresa es el filtro más alto: si el usuario tiene empresa asignada,
    # JAMÁS ve nada de otra empresa, sin importar el resto de las reglas.
    if user.empresa:
        queryset = queryset.filter(empresa=user.empresa)
    else:
        # Sin empresa asignada, no ve activos de ninguna empresa (evita
        # que alguien mal configurado vea todo por accidente).
        queryset = queryset.filter(empresa__isnull=True)

    if user.rol == 'consulta':
        persona = getattr(user, 'persona_vinculada', None)
        if not persona:
            return queryset.none()
        return queryset.filter(custodias__persona=persona).distinct()

    return queryset.filter(
        Q(creado_por=user) | Q(area_creador=user.area) | Q(custodias__area=user.area) | Q(custodias__persona__area=user.area)
    ).distinct()