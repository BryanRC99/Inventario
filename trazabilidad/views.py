from django.db.models import Q
from rest_framework import viewsets

from usuarios.permissions import PermisoPorRol

from .models import Mantenimiento, Movimiento
from .serializers import MantenimientoSerializer, MovimientoSerializer


class MovimientoViewSet(viewsets.ModelViewSet):
    serializer_class = MovimientoSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo', 'tipo_evento']

    def get_queryset(self):
        base = Movimiento.objects.select_related(
            'activo', 'usuario', 'ubicacion_origen', 'ubicacion_destino'
        )
        user = self.request.user

        if user.is_superuser or user.rol == 'admin':
            return base.all()

        return base.filter(
            Q(activo__creado_por=user)
            | Q(activo__custodias__area=user.area)
            | Q(activo__custodias__persona__area=user.area)
        ).distinct()


class MantenimientoViewSet(viewsets.ModelViewSet):
    serializer_class = MantenimientoSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo']

    def get_queryset(self):
        base = Mantenimiento.objects.select_related('activo', 'proveedor')
        user = self.request.user

        if user.is_superuser or user.rol == 'admin':
            return base.all()

        return base.filter(
            Q(activo__creado_por=user)
            | Q(activo__custodias__area=user.area)
            | Q(activo__custodias__persona__area=user.area)
        ).distinct()