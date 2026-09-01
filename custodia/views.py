from rest_framework import viewsets

from usuarios.permissions import PermisoPorRol

from .models import Custodia
from .serializers import CustodiaSerializer


class CustodiaViewSet(viewsets.ModelViewSet):
    queryset = Custodia.objects.select_related('activo', 'persona', 'activo__categoria').all()
    serializer_class = CustodiaSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo', 'persona']