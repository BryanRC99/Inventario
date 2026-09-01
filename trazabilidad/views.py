from rest_framework import viewsets

from usuarios.permissions import PermisoPorRol

from .models import Mantenimiento, Movimiento
from .serializers import MantenimientoSerializer, MovimientoSerializer


class MovimientoViewSet(viewsets.ModelViewSet):
    queryset = Movimiento.objects.select_related(
        'activo', 'usuario', 'ubicacion_origen', 'ubicacion_destino'
    ).all()
    serializer_class = MovimientoSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo', 'tipo_evento']


class MantenimientoViewSet(viewsets.ModelViewSet):
    queryset = Mantenimiento.objects.select_related('activo', 'proveedor').all()
    serializer_class = MantenimientoSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo']