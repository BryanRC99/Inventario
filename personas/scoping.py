def personas_visibles(user, queryset):
    if user.is_superuser or user.rol == 'admin':
        return queryset
    if user.empresa_id:
        return queryset.filter(empresa_id=user.empresa_id)
    return queryset.filter(empresa__isnull=True)