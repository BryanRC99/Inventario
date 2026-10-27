from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.permissions import PermisoPorRolSinConsulta

from .filters import ActivoFilter, describir_filtros
from .models import Activo, Categoria, Ubicacion
from .serializers import ActivoSerializer, CategoriaSerializer, UbicacionSerializer


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [PermisoPorRolSinConsulta]

    
class UbicacionViewSet(viewsets.ModelViewSet):
    queryset = Ubicacion.objects.select_related('ubicacion_padre').all()
    serializer_class = UbicacionSerializer
    permission_classes = [PermisoPorRolSinConsulta]


class ActivoViewSet(viewsets.ModelViewSet):
    serializer_class = ActivoSerializer
    permission_classes = [PermisoPorRolSinConsulta]
    filterset_class = ActivoFilter
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_permissions(self):
        # El rol "consulta" solo puede LEER (listar y ver el detalle) los activos que tiene
        # a su cargo: la pantalla "Mis activos" los necesita. activos_visibles ya limita el
        # resultado a sus custodias activas. Cualquier otra acción (crear, editar, reportes,
        # importar, etiquetas, dar de baja...) sigue bloqueada para este rol.
        user = self.request.user
        if self.action in ('list', 'retrieve') and user.is_authenticated and user.rol == 'consulta':
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        from .scoping import activos_visibles

        base = Activo.objects.select_related('categoria', 'ubicacion', 'proveedor')
        return activos_visibles(self.request.user, base)

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

    # ------------------------------------------------------------------
    # Importación masiva desde Excel
    # ------------------------------------------------------------------
    def _filas_importacion(self, request):
        """Lee y valida el Excel subido. Lanza ValidationError (400) con un mensaje
        claro si el archivo en conjunto no sirve."""
        from django.conf import settings
        from rest_framework.exceptions import ValidationError

        from .importacion import ArchivoImportacionInvalido, validar_archivo

        archivo = request.FILES.get('archivo')
        if not archivo:
            raise ValidationError({'detail': 'Debes subir un archivo.'})
        if not archivo.name.lower().endswith('.xlsx'):
            raise ValidationError({'detail': 'El archivo debe ser un Excel (.xlsx) descargado de la plantilla.'})
        if archivo.size > settings.IMPORTACION_MAX_BYTES:
            maximo_mb = settings.IMPORTACION_MAX_BYTES // (1024 * 1024)
            raise ValidationError({'detail': f'El archivo supera el tamaño máximo de {maximo_mb} MB.'})

        try:
            return validar_archivo(archivo)
        except ArchivoImportacionInvalido as e:
            raise ValidationError({'detail': str(e)})
        except Exception:
            raise ValidationError(
                {'detail': 'No se pudo leer el archivo. Verifica que sea el formato de la plantilla.'}
            )

    def _empresa_para_importar(self, request):
        """Empresa a la que pertenecerán TODOS los activos del archivo. Mismas reglas que al
        crear un activo a mano: el admin elige; el operador elige entre las suyas (o se usa la única)."""
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError

        from empresas.models import Empresa
        from usuarios.alcance import resolver_empresa_para_crear

        valor = request.data.get('empresa')
        elegida = None
        if valor:
            try:
                elegida = Empresa.objects.get(pk=str(valor).strip())
            except (Empresa.DoesNotExist, DjangoValidationError, ValueError):
                raise ValidationError({'empresa': ['La empresa seleccionada no existe.']})
        return resolver_empresa_para_crear(request.user, elegida)

    @staticmethod
    def _aplanar_errores(errores):
        """{'campo': ['mensaje']} -> ['Campo: mensaje'] para mostrarlo por fila."""
        mensajes = []
        for campo, valor in errores.items():
            lista = valor if isinstance(valor, (list, tuple)) else [valor]
            for m in lista:
                mensajes.append(f'{campo}: {m}' if campo not in ('non_field_errors', 'detail') else str(m))
        return mensajes

    @action(detail=False, methods=['post'])
    def validar_importacion(self, request):
        filas = self._filas_importacion(request)

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
        from rest_framework.exceptions import ValidationError

        # Primero la empresa y el archivo: si algo falla, no se crea nada.
        empresa = self._empresa_para_importar(request)
        filas = self._filas_importacion(request)

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
                    'empresa': empresa.id,
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
            try:
                if serializer.is_valid():
                    serializer.save()
                    creados.append(f['fila'])
                else:
                    errores_finales.append(
                        {'fila': f['fila'], 'errores': self._aplanar_errores(serializer.errors)}
                    )
            except ValidationError as e:
                detalle = e.detail if isinstance(e.detail, dict) else {'detail': e.detail}
                errores_finales.append({'fila': f['fila'], 'errores': self._aplanar_errores(detalle)})
            except Exception:
                # Una fila con problema inesperado no tumba el resto del archivo.
                errores_finales.append(
                    {'fila': f['fila'], 'errores': ['No se pudo guardar esta fila por un error inesperado.']}
                )

        errores_finales.sort(key=lambda e: e['fila'])
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
        tamano = request.query_params.get('tamano', 'normal')
        pdf_bytes = generar_pdf_etiqueta(activo, tamano=tamano)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="etiqueta_{activo.codigo_interno}.pdf"'
        return response

    @action(detail=False, methods=['post'])
    def etiquetas_lote(self, request):
        from django.http import HttpResponse

        from .etiquetas import generar_pdf_etiquetas_lote

        ids = request.data.get('ids', [])
        tamano = request.data.get('tamano', 'normal')

        if not ids:
            return Response({'detail': 'Debes seleccionar al menos un activo.'}, status=status.HTTP_400_BAD_REQUEST)

        activos = self.get_queryset().filter(id__in=ids)

        if not activos.exists():
            return Response({'detail': 'No se encontraron activos válidos.'}, status=status.HTTP_400_BAD_REQUEST)

        pdf_bytes = generar_pdf_etiquetas_lote(list(activos), tamano=tamano)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = 'inline; filename="etiquetas.pdf"'
        return response

    @action(detail=True, methods=['post'])
    @transaction.atomic
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

        motivo = request.data.get('motivo', '')
        motivo = motivo.strip() if isinstance(motivo, str) else ''
        if not motivo:
            return Response(
                {'detail': 'Debes indicar un motivo para dar de baja el activo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(motivo) > 255:
            return Response(
                {'detail': 'El motivo no puede superar los 255 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        hoy = date.today()

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

    def _activos_filtrados(self):
        """Mismo queryset (scoping + filtros) que usa el listado, para que los reportes coincidan con la tabla."""
        from django_filters.rest_framework import DjangoFilterBackend

        backend = DjangoFilterBackend()
        queryset = self.get_queryset().select_related('categoria', 'ubicacion', 'proveedor', 'empresa')
        # get_filterset puede lanzar ValidationError (-> 400 con detalle por campo).
        filterset = backend.get_filterset(self.request, queryset, self)
        queryset = backend.filter_queryset(self.request, queryset, self)
        return list(queryset), describir_filtros(filterset)

    @action(detail=False, methods=['get'])
    def reporte_excel(self, request):
        from django.http import HttpResponse

        from .reportes import generar_reporte_excel

        activos, filtros = self._activos_filtrados()
        contenido = generar_reporte_excel(activos, filtros)

        response = HttpResponse(
            contenido,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="reporte_activos.xlsx"'
        return response

    @action(detail=False, methods=['get'])
    def reporte_pdf(self, request):
        from django.http import HttpResponse

        from .reportes import generar_reporte_pdf

        activos, filtros = self._activos_filtrados()
        pdf_bytes = generar_reporte_pdf(activos, filtros)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = 'inline; filename="reporte_activos.pdf"'
        return response


class DashboardView(APIView):
    """GET /api/inventario/dashboard/ -> números y gráficas del panel principal."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date, timedelta

        from django.db.models import Count

        from custodia.models import Custodia
        from actas.models import ActaEntrega
        from actas.scoping import actas_visibles
        from custodia.scoping import custodias_visibles

        from .scoping import activos_visibles

        activos = activos_visibles(request.user, Activo.objects.all())
        custodias = custodias_visibles(request.user, Custodia.objects.all())

        actas_sin_escaneo = (
            actas_visibles(request.user, ActaEntrega.objects.all())
            .exclude(escaneos__eliminado=False)
            .distinct()
            .count()
        )

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
                'actas_sin_escaneo': actas_sin_escaneo,
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