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
        base = Custodia.objects.select_related('activo', 'persona', 'activo__categoria')
        user = self.request.user

        if user.is_superuser or user.rol == 'admin':
            return base.all()

        return base.filter(
            Q(area=user.area) | Q(persona__area=user.area) | Q(activo__creado_por=user)
        ).distinct()