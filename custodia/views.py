from django.db.models import Q
from rest_framework import viewsets

from usuarios.permissions import PermisoPorRol

from .models import Custodia
from .serializers import CustodiaSerializer


class CustodiaViewSet(viewsets.ModelViewSet):
    serializer_class = CustodiaSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo', 'persona']

    def get_queryset(self):
        from .scoping import custodias_visibles

        base = Custodia.objects.select_related('activo', 'persona', 'activo__categoria')
        return custodias_visibles(self.request.user, base)