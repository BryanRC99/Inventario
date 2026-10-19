from usuarios.alcance import es_admin, filtrar_por_empresas


def personas_visibles(user, queryset):
    if es_admin(user):
        return queryset
    return filtrar_por_empresas(user, queryset, 'empresa')
