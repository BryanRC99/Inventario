from io import BytesIO

from django.core.files.base import ContentFile
from django.db import transaction
from django.template.loader import render_to_string
from rest_framework import serializers
from pathlib import Path
from django.conf import settings
from weasyprint import HTML

from .models import ActaEntrega, ActaEscaneo

TEMPLATE_POR_TIPO = {
    'entrega': 'actas/acta_pdf.html',
    'devolucion': 'actas/acta_devolucion_pdf.html',
    'traslado': 'actas/acta_traslado_pdf.html',
}

def generar_pdf_acta(acta):
    logo_path = Path(settings.BASE_DIR) / 'static' / 'logovyv.png'
    logo_uri = logo_path.as_uri() if logo_path.exists() else None

    template = TEMPLATE_POR_TIPO.get(acta.tipo, 'actas/acta_pdf.html')
    html_string = render_to_string(template, {'acta': acta, 'logo_uri': logo_uri})
    pdf_bytes = HTML(string=html_string, base_url=str(settings.BASE_DIR)).write_pdf()
    acta.pdf.save(f'acta_{acta.id}.pdf', ContentFile(pdf_bytes), save=True)


class ActaEntregaSerializer(serializers.ModelSerializer):
    activo_nombre = serializers.CharField(source='activo.nombre', read_only=True)
    activo_codigo = serializers.CharField(source='activo.codigo_interno', read_only=True)
    persona_nombre = serializers.CharField(source='persona.nombre_completo', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    escaneos_count = serializers.SerializerMethodField()

    class Meta:
        model = ActaEntrega
        fields = [
            'id',
            'activo',
            'activo_nombre',
            'activo_codigo',
            'persona',
            'persona_nombre',
            'custodia',
            'fecha',
            'tipo',
            'tipo_display',
            'pdf',
            'observaciones',
            'generado_por',
            'escaneos_count',
        ]
        read_only_fields = ['pdf', 'generado_por']

    def get_escaneos_count(self, obj):
        # El listado ya trae el conteo calculado en una sola consulta (ver la vista).
        n = getattr(obj, 'escaneos_count', None)
        return n if n is not None else obj.escaneos.filter(eliminado=False).count()

    def validate(self, attrs):
        from usuarios.alcance import validar_acceso

        validar_acceso(self.context['request'].user, attrs['activo'], attrs['persona'])
        custodia = attrs.get('custodia')
        if custodia and (
            custodia.activo_id != attrs['activo'].id
            or custodia.persona_id != attrs['persona'].id
        ):
            raise serializers.ValidationError(
                {'custodia': 'La custodia no corresponde al activo y la persona indicados.'}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data['generado_por'] = self.context['request'].user
        instance = super().create(validated_data)
        generar_pdf_acta(instance)
        return instance


def _nombre_usuario(usuario):
    if not usuario:
        return None
    return usuario.get_full_name().strip() or usuario.username


class ActaEscaneoSerializer(serializers.ModelSerializer):
    """Metadatos del escaneo. A propósito NO incluye ninguna URL del archivo:
    el contenido solo se obtiene por el endpoint autenticado."""

    subido_por_nombre = serializers.SerializerMethodField()
    eliminado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ActaEscaneo
        fields = [
            'id',
            'nombre_original',
            'tipo_contenido',
            'tamano',
            'sha256',
            'subido_por_nombre',
            'fecha_subida',
            'eliminado',
            'eliminado_por_nombre',
            'fecha_eliminacion',
            'motivo_eliminacion',
        ]
        read_only_fields = fields

    def get_subido_por_nombre(self, obj):
        return _nombre_usuario(obj.subido_por)

    def get_eliminado_por_nombre(self, obj):
        return _nombre_usuario(obj.eliminado_por)
