from rest_framework import viewsets

from usuarios.permissions import PermisoPorRolSinConsulta

from .models import Proveedor
from .serializers import ProveedorSerializer


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [PermisoPorRolSinConsulta]