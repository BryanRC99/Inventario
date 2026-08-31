from rest_framework import viewsets

from usuarios.permissions import PermisoPorRol

from .models import Categoria, Ubicacion
from .serializers import CategoriaSerializer, UbicacionSerializer


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [PermisoPorRol]


class UbicacionViewSet(viewsets.ModelViewSet):
    queryset = Ubicacion.objects.select_related('ubicacion_padre').all()
    serializer_class = UbicacionSerializer
    permission_classes = [PermisoPorRol]