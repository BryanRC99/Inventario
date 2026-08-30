from rest_framework import viewsets

from usuarios.permissions import PermisoPorRol

from .models import Categoria
from .serializers import CategoriaSerializer


class CategoriaViewSet(viewsets.ModelViewSet):
    """
    Expone automáticamente:
    GET    /api/inventario/categorias/          -> listar
    POST   /api/inventario/categorias/          -> crear
    GET    /api/inventario/categorias/{id}/     -> detalle
    PUT    /api/inventario/categorias/{id}/     -> actualizar completo
    PATCH  /api/inventario/categorias/{id}/     -> actualizar parcial
    DELETE /api/inventario/categorias/{id}/     -> borrar
    """

    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [PermisoPorRol]