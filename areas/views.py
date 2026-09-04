from rest_framework import viewsets

from usuarios.permissions import LecturaTodosEscribeAdmin

from .models import Area
from .serializers import AreaSerializer


class AreaViewSet(viewsets.ModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    permission_classes = [LecturaTodosEscribeAdmin]