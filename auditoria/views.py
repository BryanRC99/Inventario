import django_filters
from django.db.models import CharField, Q
from django.db.models.functions import Cast
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination

from usuarios.permissions import SoloAdmin

from .models import RegistroAuditoria
from .serializers import RegistroAuditoriaSerializer


class AuditoriaPagination(PageNumberPagination):
    page_size = 20


class RegistroAuditoriaFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='buscar')
    fecha_hora_after = django_filters.DateFilter(field_name='fecha_hora', lookup_expr='date__gte')
    fecha_hora_before = django_filters.DateFilter(field_name='fecha_hora', lookup_expr='date__lte')

    class Meta:
        model = RegistroAuditoria
        fields = {
            'accion': ['exact'],
            'modelo': ['exact'],
        }

    def buscar(self, queryset, name, value):
        value = (value or '').strip()
        if not value:
            return queryset
        return queryset.annotate(
            _ip_texto=Cast('ip_address', output_field=CharField()),
        ).filter(
            Q(usuario_username__icontains=value)
            | Q(objeto_repr__icontains=value)
            | Q(objeto_id__icontains=value)
            | Q(modelo__icontains=value)
            | Q(ip_address__isnull=False, _ip_texto__icontains=value)
            | Q(user_agent__icontains=value)
            | Q(accion__icontains=value)
        )


class RegistroAuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Solo lectura, solo Admin. Filtrable por:
    ?usuario_username=juan  ?accion=editar  ?modelo=Activo
    ?fecha_hora_after=2026-01-01  ?fecha_hora_before=2026-01-31
    """
    
    queryset = RegistroAuditoria.objects.select_related('usuario').order_by('-fecha_hora', '-pk')
    serializer_class = RegistroAuditoriaSerializer
    permission_classes = [SoloAdmin]
    filterset_class = RegistroAuditoriaFilter
    pagination_class = AuditoriaPagination
