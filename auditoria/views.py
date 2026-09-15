from rest_framework import viewsets

from usuarios.permissions import SoloAdmin

from .models import RegistroAuditoria
from .serializers import RegistroAuditoriaSerializer


class RegistroAuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Solo lectura, solo Admin. Filtrable por:
    ?usuario_username=juan  ?accion=editar  ?modelo=Activo
    ?fecha_hora_after=2026-01-01  ?fecha_hora_before=2026-01-31
    """

    queryset = RegistroAuditoria.objects.select_related('usuario').all()
    serializer_class = RegistroAuditoriaSerializer
    permission_classes = [SoloAdmin]
    filterset_fields = {
        'accion': ['exact'],
        'modelo': ['exact'],
        'usuario_username': ['exact', 'icontains'],
        'fecha_hora': ['gte', 'lte'],
    }