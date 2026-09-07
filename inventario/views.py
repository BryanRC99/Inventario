from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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
        from .scoping import activos_visibles

        base = Activo.objects.select_related('categoria', 'ubicacion', 'proveedor')
        return activos_visibles(self.request.user, base)

    @action(detail=True, methods=['get'])
    def etiqueta(self, request, pk=None):
        from django.http import HttpResponse

        from .etiquetas import generar_pdf_etiqueta

        activo = self.get_object()
        pdf_bytes = generar_pdf_etiqueta(activo)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="etiqueta_{activo.codigo_interno}.pdf"'
        return response

class DashboardView(APIView):
    """GET /api/inventario/dashboard/ -> números y gráficas del panel principal."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date, timedelta

        from django.db.models import Count

        from custodia.models import Custodia
        from custodia.scoping import custodias_visibles

        from .scoping import activos_visibles

        activos = activos_visibles(request.user, Activo.objects.all())
        custodias = custodias_visibles(request.user, Custodia.objects.all())

        limite_garantia = date.today() + timedelta(days=30)

        estado_labels = dict(Activo.Estado.choices)

        por_estado_raw = activos.values('estado').annotate(total=Count('id')).order_by('-total')
        por_categoria_raw = (
            activos.values('categoria__nombre').annotate(total=Count('id')).order_by('-total')
        )
        por_ubicacion_raw = (
            activos.values('ubicacion__nombre').annotate(total=Count('id')).order_by('-total')
        )

        return Response(
            {
                'total_activos': activos.count(),
                'custodias_activas': custodias.filter(fecha_fin__isnull=True).count(),
                'en_mantenimiento': activos.filter(estado='en_mantenimiento').count(),
                'garantias_por_vencer': activos.filter(
                    fecha_fin_garantia__isnull=False,
                    fecha_fin_garantia__gte=date.today(),
                    fecha_fin_garantia__lte=limite_garantia,
                ).count(),
                'por_estado': [
                    {
                        'estado': item['estado'],
                        'label': estado_labels.get(item['estado'], item['estado']),
                        'total': item['total'],
                    }
                    for item in por_estado_raw
                ],
                'por_categoria': [
                    {'categoria': item['categoria__nombre'], 'total': item['total']}
                    for item in por_categoria_raw
                ],
                'por_ubicacion': [
                    {'ubicacion': item['ubicacion__nombre'], 'total': item['total']}
                    for item in por_ubicacion_raw
                ],
            }
        )