from django.db.models import Q
from rest_framework import viewsets

from usuarios.permissions import PermisoPorRol

from .models import ActaEntrega
from .serializers import ActaEntregaSerializer


class ActaEntregaViewSet(viewsets.ModelViewSet):
    serializer_class = ActaEntregaSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo', 'persona', 'tipo', 'custodia']

    def get_queryset(self):
        base = ActaEntrega.objects.select_related('activo', 'persona')
        user = self.request.user

        if user.is_superuser or user.rol == 'admin':
            return base.all()

        return base.filter(
            Q(generado_por=user) | Q(persona__area=user.area) | Q(activo__creado_por=user)
        ).distinct()