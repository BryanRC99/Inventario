from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import SearchFilter
from rest_framework.pagination import PageNumberPagination

from usuarios.alcance import filtrar_por_empresas, ve_todo_en_sus_empresas
from usuarios.permissions import PermisoPorRol

from .models import Mantenimiento, Movimiento
from .serializers import MantenimientoSerializer, MovimientoSerializer


class HistorialPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = None


def _filtrar_por_rol(user, base):
    if user.is_superuser or user.rol == 'admin':
        return base.all()

    base = filtrar_por_empresas(user, base, 'activo__empresa')

    if user.rol == 'consulta':
        persona = getattr(user, 'persona_vinculada', None)
        if not persona:
            return base.none()
        return base.filter(
            activo__custodias__persona=persona,
            activo__custodias__fecha_fin__isnull=True,
        ).distinct()

    if ve_todo_en_sus_empresas(user):
        return base

    q = Q(activo__creado_por=user)
    if user.area_id:
        q |= (
            Q(activo__area_creador_id=user.area_id)
            | Q(activo__custodias__area_id=user.area_id)
            | Q(activo__custodias__persona__area_id=user.area_id)
        )
    return base.filter(q).distinct()


class MovimientoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MovimientoSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo', 'tipo_evento']
    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = [
        'activo__codigo_interno', 'activo__etiqueta_origen', 'activo__nombre',
        'activo__numero_serie', 'tipo_evento', 'usuario__username', 'observaciones',
        'ubicacion_origen__nombre', 'ubicacion_destino__nombre',
    ]
    pagination_class = HistorialPagination

    def get_queryset(self):
        base = Movimiento.objects.select_related(
            'activo', 'usuario', 'ubicacion_origen', 'ubicacion_destino'
        ).order_by('-fecha_hora', '-pk')
        return _filtrar_por_rol(self.request.user, base)


class MantenimientoViewSet(viewsets.ModelViewSet):
    serializer_class = MantenimientoSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo']
    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = [
        'activo__codigo_interno', 'activo__etiqueta_origen', 'activo__nombre',
        'activo__numero_serie', 'activo__marca', 'activo__modelo',
        'descripcion_problema', 'repuestos_usados', 'proveedor__nombre',
    ]
    pagination_class = HistorialPagination
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_queryset(self):
        base = Mantenimiento.objects.select_related('activo', 'proveedor').order_by('-fecha', '-pk')
        return _filtrar_por_rol(self.request.user, base)
