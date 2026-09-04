from rest_framework import viewsets
from rest_framework.decorators import action

from usuarios.permissions import PermisoPorRol

from .models import Activo, Categoria, Ubicacion
from .serializers import ActivoSerializer, CategoriaSerializer, UbicacionSerializer


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [PermisoPorRol]


class UbicacionViewSet(viewsets.ModelViewSet):
    queryset = Ubicacion.objects.select_related('ubicacion_padre').all()
    serializer_class = UbicacionSerializer
    permission_classes = [PermisoPorRol]


class ActivoViewSet(viewsets.ModelViewSet):
    serializer_class = ActivoSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['estado', 'categoria', 'ubicacion']

    def get_queryset(self):
        from django.db.models import Q

        base = Activo.objects.select_related('categoria', 'ubicacion', 'proveedor')
        user = self.request.user

        if user.is_superuser or user.rol == 'admin':
            return base.all()

        # Ve activos que él mismo creó, o que están (o estuvieron) bajo
        # custodia de alguien de su misma área.
        return base.filter(
            Q(creado_por=user)
            | Q(custodias__area=user.area)
            | Q(custodias__persona__area=user.area)
        ).distinct()

    @action(detail=True, methods=['get'])
    def etiqueta(self, request, pk=None):
        from django.http import HttpResponse

        from .etiquetas import generar_pdf_etiqueta

        activo = self.get_object()
        pdf_bytes = generar_pdf_etiqueta(activo)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="etiqueta_{activo.codigo_interno}.pdf"'
        return response