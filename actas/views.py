import uuid

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Count, OuterRef, Subquery
from django.db.models.functions import Coalesce
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from auditoria.utils import registrar_auditoria
from usuarios.alcance import es_admin
from usuarios.permissions import PermisoPorRol

from .escaneos import ArchivoInvalido, inspeccionar, limpiar_nombre
from .models import ActaEntrega, ActaEscaneo
from .scoping import actas_visibles
from .serializers import ActaEntregaSerializer, ActaEscaneoSerializer

ID_ESCANEO = r'(?P<escaneo_id>[0-9a-fA-F-]{32,36})'


def _conteo_escaneos():
    """Cantidad de escaneos activos por acta, calculada en la misma consulta del listado."""
    activos = (
        ActaEscaneo.objects.filter(acta=OuterRef('pk'), eliminado=False)
        .order_by()
        .values('acta')
        .annotate(n=Count('pk'))
        .values('n')
    )
    return Coalesce(Subquery(activos), 0)


class ActaEntregaViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                         mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ActaEntregaSerializer
    permission_classes = [PermisoPorRol]
    filterset_fields = ['activo', 'persona', 'tipo', 'custodia']

    def get_queryset(self):
        base = ActaEntrega.objects.select_related('activo', 'persona')
        return actas_visibles(self.request.user, base).annotate(escaneos_count=_conteo_escaneos())

    # ------------------------------------------------------------------
    # Escaneos de actas firmadas
    #
    # Permisos (los de PermisoPorRol + la visibilidad del acta en get_queryset):
    #   ver/listar  -> cualquiera que pueda ver el acta (consulta: solo la suya)
    #   subir       -> admin y operador
    #   eliminar    -> solo admin (borrado lógico, con motivo)
    #   restaurar   -> solo admin
    # ------------------------------------------------------------------
    @action(detail=True, methods=['get', 'post'], url_path='escaneos',
            parser_classes=[MultiPartParser, FormParser])
    def escaneos(self, request, pk=None):
        acta = self.get_object()
        if request.method == 'POST':
            return self._subir_escaneos(request, acta)

        consulta = acta.escaneos.select_related('subido_por', 'eliminado_por')
        incluir = request.query_params.get('incluir_eliminados') in ('1', 'true')
        if not (incluir and es_admin(request.user)):
            consulta = consulta.filter(eliminado=False)
        return Response(ActaEscaneoSerializer(consulta, many=True).data)

    def _subir_escaneos(self, request, acta):
        maximo = settings.ACTAS_ESCANEO_MAX_ARCHIVOS
        archivos = request.FILES.getlist('archivos')
        if not archivos:
            raise ValidationError({'archivos': ['Selecciona al menos un archivo.']})
        if len(archivos) > maximo:
            raise ValidationError({'archivos': [f'Puedes subir como máximo {maximo} archivos a la vez.']})

        # 1) Validar TODO antes de escribir nada: o se guardan todos o ninguno.
        validos, errores, vistos = [], [], set()
        for archivo in archivos:
            try:
                info = inspeccionar(archivo)
            except ArchivoInvalido as e:
                errores.append(f'"{limpiar_nombre(archivo.name)}": {e}')
                continue
            if info.sha256 in vistos:
                errores.append(f'"{info.nombre}": está repetido en la selección.')
                continue
            vistos.add(info.sha256)
            validos.append((archivo, info))
        if errores:
            raise ValidationError({'archivos': errores + ['No se guardó ningún archivo.']})

        # 2) Guardar. El bloqueo de la fila del acta evita que dos subidas simultáneas
        #    superen el máximo o dupliquen un archivo.
        escritos, creados = [], []
        try:
            with transaction.atomic():
                ActaEntrega.objects.select_for_update().get(pk=acta.pk)
                activos = acta.escaneos.filter(eliminado=False)
                if activos.count() + len(validos) > maximo:
                    raise ValidationError({'archivos': [
                        f'Esta acta ya tiene {activos.count()} archivo(s) y el máximo es {maximo}.'
                    ]})
                existentes = set(activos.values_list('sha256', flat=True))
                repetidos = [info.nombre for _, info in validos if info.sha256 in existentes]
                if repetidos:
                    raise ValidationError({'archivos': [
                        f'"{n}": ya fue subido a esta acta.' for n in repetidos
                    ] + ['No se guardó ningún archivo.']})

                for archivo, info in validos:
                    escaneo = ActaEscaneo(
                        acta=acta,
                        nombre_original=info.nombre,
                        tipo_contenido=info.tipo_contenido,
                        tamano=info.tamano,
                        sha256=info.sha256,
                        subido_por=request.user,
                    )
                    # Nombre aleatorio en disco: no revela datos ni permite adivinar rutas.
                    escaneo.archivo.save(f'{uuid.uuid4().hex}{info.extension}', archivo, save=False)
                    escritos.append(escaneo.archivo.name)
                    escaneo.save()
                    creados.append(escaneo)
                    registrar_auditoria(
                        accion='crear', modelo='ActaEscaneo', objeto_id=escaneo.pk,
                        objeto_repr=str(escaneo)[:255],
                    )
        except IntegrityError:
            self._limpiar_archivos(escritos)
            raise ValidationError({'archivos': ['Alguno de los archivos ya existe en esta acta. No se guardó ninguno.']})
        except Exception:
            self._limpiar_archivos(escritos)
            raise

        return Response(ActaEscaneoSerializer(creados, many=True).data, status=status.HTTP_201_CREATED)

    @staticmethod
    def _limpiar_archivos(nombres):
        from .almacenamiento import almacen_privado

        for nombre in nombres:
            try:
                almacen_privado.delete(nombre)
            except OSError:
                pass

    def _escaneo(self, request, acta, escaneo_id):
        try:
            escaneo_id = uuid.UUID(escaneo_id)
        except ValueError:
            raise NotFound()
        consulta = acta.escaneos.select_related('subido_por', 'eliminado_por')
        if not es_admin(request.user):
            consulta = consulta.filter(eliminado=False)  # para el resto, lo eliminado "no existe"
        return get_object_or_404(consulta, pk=escaneo_id)

    @action(detail=True, methods=['get'], url_path=f'escaneos/{ID_ESCANEO}/archivo')
    def escaneo_archivo(self, request, pk=None, escaneo_id=None):
        """Entrega el archivo, solo con sesión válida y permiso sobre el acta."""
        acta = self.get_object()
        escaneo = self._escaneo(request, acta, escaneo_id)

        try:
            almacen = escaneo.archivo.storage
            if not almacen.exists(escaneo.archivo.name):
                raise FileNotFoundError
            manejador = almacen.open(escaneo.archivo.name, 'rb')  # su .name es la ruta real: FileResponse calcula Content-Length
        except (FileNotFoundError, OSError, ValueError):
            raise NotFound(
                'El archivo no se encuentra en el servidor. Informa al administrador para '
                'restaurarlo desde el respaldo.'
            )

        registrar_auditoria(
            accion='ver_escaneo', modelo='ActaEscaneo', objeto_id=escaneo.pk,
            objeto_repr=str(escaneo)[:255],
        )
        respuesta = FileResponse(
            manejador,
            content_type=escaneo.tipo_contenido,
            as_attachment=request.query_params.get('descargar') in ('1', 'true'),
            filename=escaneo.nombre_original,
        )
        respuesta['X-Content-Type-Options'] = 'nosniff'
        respuesta['Cache-Control'] = 'private, no-store'
        respuesta['Content-Security-Policy'] = "default-src 'none'; sandbox"
        return respuesta

    @action(detail=True, methods=['delete'], url_path=f'escaneos/{ID_ESCANEO}')
    def escaneo_eliminar(self, request, pk=None, escaneo_id=None):
        """Borrado lógico (solo admin, por PermisoPorRol): el archivo sigue en disco."""
        acta = self.get_object()
        escaneo = self._escaneo(request, acta, escaneo_id)
        if escaneo.eliminado:
            raise ValidationError({'detail': 'Este archivo ya está eliminado.'})
        motivo = str(request.data.get('motivo', '')).strip()
        if len(motivo) < 5:
            raise ValidationError({'motivo': ['Indica el motivo de la eliminación (mínimo 5 caracteres).']})
        if len(motivo) > 255:
            raise ValidationError({'motivo': ['El motivo no puede superar los 255 caracteres.']})

        escaneo.eliminado = True
        escaneo.eliminado_por = request.user
        escaneo.fecha_eliminacion = timezone.now()
        escaneo.motivo_eliminacion = motivo
        escaneo.save(update_fields=['eliminado', 'eliminado_por', 'fecha_eliminacion', 'motivo_eliminacion'])
        registrar_auditoria(
            accion='eliminar', modelo='ActaEscaneo', objeto_id=escaneo.pk,
            objeto_repr=str(escaneo)[:255], cambios={'motivo': {'antes': None, 'despues': motivo}},
        )
        return Response(ActaEscaneoSerializer(escaneo).data)

    @action(detail=True, methods=['post'], url_path=f'escaneos/{ID_ESCANEO}/restaurar')
    def escaneo_restaurar(self, request, pk=None, escaneo_id=None):
        if not es_admin(request.user):
            raise PermissionDenied('Solo un administrador puede restaurar archivos eliminados.')
        acta = self.get_object()
        escaneo = self._escaneo(request, acta, escaneo_id)
        if not escaneo.eliminado:
            raise ValidationError({'detail': 'Este archivo no está eliminado.'})

        maximo = settings.ACTAS_ESCANEO_MAX_ARCHIVOS
        try:
            with transaction.atomic():
                ActaEntrega.objects.select_for_update().get(pk=acta.pk)
                if acta.escaneos.filter(eliminado=False).count() >= maximo:
                    raise ValidationError({'detail': f'El acta ya tiene el máximo de {maximo} archivos.'})
                escaneo.eliminado = False
                escaneo.eliminado_por = None
                escaneo.fecha_eliminacion = None
                escaneo.motivo_eliminacion = ''
                escaneo.save(update_fields=['eliminado', 'eliminado_por', 'fecha_eliminacion', 'motivo_eliminacion'])
        except IntegrityError:
            raise ValidationError({'detail': 'Ya existe un archivo idéntico activo en esta acta.'})

        registrar_auditoria(
            accion='editar', modelo='ActaEscaneo', objeto_id=escaneo.pk, objeto_repr=str(escaneo)[:255],
            cambios={'eliminado': {'antes': 'True', 'despues': 'False'}},
        )
        return Response(ActaEscaneoSerializer(escaneo).data)
