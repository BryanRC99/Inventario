from django.db.models import Q
from rest_framework import viewsets

from usuarios.alcance import filtrar_por_empresas, ve_todo_en_sus_empresas
from usuarios.permissions import PermisoPorRol

from .models import Mantenimiento, Movimiento
from .serializers import MantenimientoSerializer, MovimientoSerializer


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