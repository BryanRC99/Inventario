from rest_framework import viewsets

from usuarios.permissions import LecturaStaffEscribeAdmin

from .models import Empresa
from .serializers import EmpresaSerializer


class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    permission_classes = [LecturaStaffEscribeAdmin]