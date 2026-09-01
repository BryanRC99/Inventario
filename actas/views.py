from rest_framework import viewsets

from usuarios.permissions import PermisoPorRol

from .models import ActaEntrega
from .serializers import ActaEntregaSerializer


class ActaEntregaViewSet(viewsets.ModelViewSet):
    queryset = ActaEntrega.objects.select_related('activo', 'persona').all()
    serializer_class = ActaEntregaSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo', 'persona', 'tipo', 'custodia']