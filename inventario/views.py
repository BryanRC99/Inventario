from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response

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

    def destroy(self, request, *args, **kwargs):
        from django.db.models import ProtectedError

        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    'detail': (
                        'No se puede eliminar este activo porque tiene custodias, '
                        'movimientos, mantenimientos o actas asociadas. '
                        'Si ya no está en uso, cambia su estado a "Dado de baja" en su lugar.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['get'])
    def plantilla_importacion(self, request):
        from django.http import HttpResponse

        from .importacion import generar_plantilla_excel

        contenido = generar_plantilla_excel()
        response = HttpResponse(
            contenido,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="plantilla_activos.xlsx"'
        return response

    @action(detail=False, methods=['post'])
    def validar_importacion(self, request):
        from .importacion import validar_archivo

        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({'detail': 'Debes subir un archivo.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            filas = validar_archivo(archivo)
        except Exception:
            return Response(
                {'detail': 'No se pudo leer el archivo. Verifica que sea el formato de la plantilla.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Guardamos temporalmente los datos ya validados en sesión-less
        # token: en vez de eso, devolvemos todo al frontend y que nos lo
        # reenvíe en confirmar_importacion (más simple, sin estado en servidor).
        return Response(
            {
                'total': len(filas),
                'validas': sum(1 for f in filas if f['valido']),
                'invalidas': sum(1 for f in filas if not f['valido']),
                'filas': [
                    {'fila': f['fila'], 'valido': f['valido'], 'errores': f['errores'], 'datos_mostrar': f['datos_mostrar']}
                    for f in filas
                ],
            }
        )

    @action(detail=False, methods=['post'])
    def confirmar_importacion(self, request):
        from .importacion import validar_archivo

        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({'detail': 'Debes subir un archivo.'}, status=status.HTTP_400_BAD_REQUEST)

        filas = validar_archivo(archivo)
        creados = []
        errores_finales = []

        for f in filas:
            if not f['valido']:
                errores_finales.append({'fila': f['fila'], 'errores': f['errores']})
                continue

            datos = f['datos']
            serializer = ActivoSerializer(
                data={
                    'nombre': datos['nombre'],
                    'categoria': datos['categoria'].id,
                    'ubicacion': datos['ubicacion'].id,
                    'marca': datos['marca'],
                    'modelo': datos['modelo'],
                    'numero_serie': datos['numero_serie'],
                    'estado': datos['estado'],
                    'proveedor': datos['proveedor'].id if datos.get('proveedor') else None,
                    'fecha_adquisicion': datos['fecha_adquisicion'],
                    'fecha_fin_garantia': datos['fecha_fin_garantia'],
                    'valor_adquisicion': datos.get('valor_adquisicion'),
                },
                context={'request': request},
            )
            if serializer.is_valid():
                serializer.save()
                creados.append(f['fila'])
            else:
                errores_finales.append({'fila': f['fila'], 'errores': list(serializer.errors.values())})

        return Response(
            {
                'creados': len(creados),
                'errores': errores_finales,
            }
        )

    @action(detail=True, methods=['get'])
    def etiqueta(self, request, pk=None):
        from django.http import HttpResponse

        from .etiquetas import generar_pdf_etiqueta

        activo = self.get_object()
        pdf_bytes = generar_pdf_etiqueta(activo)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="etiqueta_{activo.codigo_interno}.pdf"'
        return response

    @action(detail=True, methods=['post'])
    def dar_de_baja(self, request, pk=None):
        from datetime import date

        from custodia.models import Custodia
        from trazabilidad.utils import registrar_movimiento

        activo = self.get_object()

        if activo.estado == Activo.Estado.DADO_DE_BAJA:
            return Response(
                {'detail': 'Este activo ya está dado de baja.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        motivo = request.data.get('motivo', '').strip()
        if not motivo:
            return Response(
                {'detail': 'Debes indicar un motivo para dar de baja el activo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        hoy = date.today()

        # Cierra automáticamente cualquier custodia activa: un activo dado
        # de baja no puede seguir figurando como asignado a alguien.
        custodias_activas = Custodia.objects.filter(activo=activo, fecha_fin__isnull=True)
        for custodia in custodias_activas:
            custodia.fecha_fin = hoy
            custodia.save(update_fields=['fecha_fin'])
            titular = custodia.persona.nombre_completo if custodia.persona else custodia.area.nombre
            registrar_movimiento(
                activo=activo,
                tipo_evento='devolucion',
                usuario=request.user,
                observaciones=f'Custodia finalizada automáticamente por baja del activo (custodio: {titular}).',
            )

        activo.estado = Activo.Estado.DADO_DE_BAJA
        activo.motivo_baja = motivo
        activo.fecha_baja = hoy
        activo.save(update_fields=['estado', 'motivo_baja', 'fecha_baja'])

        registrar_movimiento(
            activo=activo,
            tipo_evento='baja',
            usuario=request.user,
            observaciones=motivo,
        )

        return Response(self.get_serializer(activo).data)

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