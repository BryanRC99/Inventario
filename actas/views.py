import os

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from auditoria.utils import registrar_auditoria
from usuarios.permissions import PermisoPorRol

from .escaneos import ACEPTADOS, ArchivoInvalido, analizar_archivo
from .filters import ActaFilter
from .models import ActaEntrega, ActaEscaneo
from .scoping import actas_visibles
from .serializers import ActaEntregaSerializer, ActaEscaneoSerializer

UUID_RE = r'[0-9a-fA-F-]{36}'


class ActaEntregaViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                         mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ActaEntregaSerializer
    permission_classes = [PermisoPorRol]
    filterset_class = ActaFilter

    def get_queryset(self):
        base = ActaEntrega.objects.select_related('activo', 'persona').annotate(
            escaneos_activos=Count('escaneos', filter=Q(escaneos__eliminado=False), distinct=True)
        )
        return actas_visibles(self.request.user, base)

    # ---------- Escaneos del acta firmada ----------
    @action(detail=True, methods=['get', 'post'], url_path='escaneos', parser_classes=[MultiPartParser, FormParser])
    def escaneos(self, request, pk=None):
        """GET: lista los escaneos activos. POST (admin/operador): sube uno o varios archivos en `archivos`."""
        acta = self.get_object()  # aplica el alcance por empresa/rol: sin acceso al acta, sin acceso a sus escaneos

        if request.method == 'GET':
            qs = acta.escaneos.filter(eliminado=False).select_related('subido_por')
            return Response(ActaEscaneoSerializer(qs, many=True).data)

        archivos = request.FILES.getlist('archivos')
        if not archivos:
            return Response({'archivos': ['Seleccione al menos un archivo para subir.']}, status=status.HTTP_400_BAD_REQUEST)

        maximo = settings.ACTA_ESCANEO_MAX_ARCHIVOS
        analizados, errores = [], []
        for f in archivos:
            try:
                analizados.append((f, *analizar_archivo(f)))
            except ArchivoInvalido as e:
                errores.append(str(e))
        if errores:
            return Response({'archivos': errores}, status=status.HTTP_400_BAD_REQUEST)

        guardados = []
        try:
            with transaction.atomic():
                ActaEntrega.objects.select_for_update().get(pk=acta.pk)  # evita pasarse del límite con subidas simultáneas
                existentes = acta.escaneos.filter(eliminado=False).count()
                if existentes + len(analizados) > maximo:
                    return Response(
                        {'archivos': [f'Cada acta admite máximo {maximo} archivos. Ya tiene {existentes}; puede agregar {max(maximo - existentes, 0)} más.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                for f, tipo, tamano, sha in analizados:
                    esc = ActaEscaneo(
                        acta=acta, nombre_original=os.path.basename(f.name)[:255], tipo_contenido=tipo,
                        tamano=tamano, sha256=sha, subido_por=request.user,
                    )
                    esc.archivo.save(f.name, f, save=False)
                    esc.save()
                    guardados.append(esc)
                    registrar_auditoria(
                        accion='crear', modelo='ActaEscaneo', objeto_id=esc.id,
                        objeto_repr=f'Escaneo de {acta} ({esc.nombre_original})',
                    )
        except Exception:
            for esc in guardados:  # no dejar archivos huérfanos en disco si la transacción se revierte
                esc.archivo.delete(save=False)
            raise
        return Response(ActaEscaneoSerializer(guardados, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path=rf'escaneos/(?P<escaneo_id>{UUID_RE})/archivo')
    def escaneo_archivo(self, request, pk=None, escaneo_id=None):
        """Entrega el archivo solo a quien tenga acceso al acta. ?descargar=1 fuerza la descarga."""
        acta = self.get_object()
        esc = get_object_or_404(acta.escaneos.filter(eliminado=False), pk=escaneo_id)
        try:
            handle = esc.archivo.open('rb')
        except FileNotFoundError:
            return Response(
                {'detail': 'El archivo no se encuentra en el servidor. Informe al administrador para restaurarlo desde el respaldo.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        resp = FileResponse(handle, content_type=esc.tipo_contenido, as_attachment=bool(request.query_params.get('descargar')),
                            filename=esc.nombre_original)
        resp['X-Content-Type-Options'] = 'nosniff'
        resp['Cache-Control'] = 'private, no-store'
        return resp

    @action(detail=True, methods=['delete'], url_path=rf'escaneos/(?P<escaneo_id>{UUID_RE})')
    def escaneo_eliminar(self, request, pk=None, escaneo_id=None):
        """Borrado lógico (solo Admin, con motivo): el archivo queda en disco y en el respaldo."""
        acta = self.get_object()
        esc = get_object_or_404(acta.escaneos.filter(eliminado=False), pk=escaneo_id)
        motivo = str(request.data.get('motivo', '')).strip()
        if len(motivo) < 5:
            return Response({'motivo': ['Indique el motivo de la eliminación (mínimo 5 caracteres).']}, status=status.HTTP_400_BAD_REQUEST)
        esc.eliminado = True
        esc.eliminado_por = request.user
        esc.fecha_eliminacion = timezone.now()
        esc.motivo_eliminacion = motivo[:255]
        esc.save(update_fields=['eliminado', 'eliminado_por', 'fecha_eliminacion', 'motivo_eliminacion'])
        registrar_auditoria(
            accion='eliminar', modelo='ActaEscaneo', objeto_id=esc.id,
            objeto_repr=f'Escaneo de {acta} ({esc.nombre_original})', cambios={'motivo': {'antes': None, 'despues': motivo}},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
