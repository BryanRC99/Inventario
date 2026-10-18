from django.db.models import Q
from rest_framework import viewsets

from usuarios.permissions import PermisoPorRol

from .models import Mantenimiento, Movimiento
from .serializers import MantenimientoSerializer, MovimientoSerializer


def _filtrar_por_rol(user, base):
    if user.is_superuser or user.rol == 'admin':
        return base.all()

    if user.empresa_id:
        base = base.filter(activo__empresa_id=user.empresa_id)
    else:
        base = base.filter(activo__empresa__isnull=True)

    if user.rol == 'consulta':
        persona = getattr(user, 'persona_vinculada', None)
        if not persona:
            return base.none()
        return base.filter(
            activo__custodias__persona=persona,
            activo__custodias__fecha_fin__isnull=True,
        ).distinct()

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

    def get_queryset(self):
        base = Movimiento.objects.select_related(
            'activo', 'usuario', 'ubicacion_origen', 'ubicacion_destino'
        )
        return _filtrar_por_rol(self.request.user, base)


class MantenimientoViewSet(viewsets.ModelViewSet):
    serializer_class = MantenimientoSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo']
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_queryset(self):
        base = Mantenimiento.objects.select_related('activo', 'proveedor')
        return _filtrar_por_rol(self.request.user, base)