from django.db.models import Q
from rest_framework import mixins, viewsets

from usuarios.permissions import PermisoPorRol

from .models import ActaEntrega
from .serializers import ActaEntregaSerializer


class ActaEntregaViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                         mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ActaEntregaSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo', 'persona', 'tipo', 'custodia']

    def get_queryset(self):
        base = ActaEntrega.objects.select_related('activo', 'persona')
        user = self.request.user

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
            return base.filter(persona=persona)

        q = Q(generado_por=user) | Q(activo__creado_por=user)
        if user.area_id:
            q |= Q(persona__area_id=user.area_id) | Q(activo__area_creador_id=user.area_id)
        return base.filter(q).distinct()