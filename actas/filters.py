import django_filters

from .models import ActaEntrega


class ActaFilter(django_filters.FilterSet):
    # ?escaneada=true  -> con respaldo digital;  ?escaneada=false -> pendientes de escanear
    escaneada = django_filters.BooleanFilter(method='filtrar_escaneada')

    class Meta:
        model = ActaEntrega
        fields = ['activo', 'persona', 'tipo', 'custodia', 'escaneada']

    def filtrar_escaneada(self, queryset, name, value):
        if value is None:
            return queryset
        return queryset.filter(escaneos_activos__gt=0) if value else queryset.filter(escaneos_activos=0)
