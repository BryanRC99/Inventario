from io import BytesIO

from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from rest_framework import serializers
from xhtml2pdf import pisa

from .models import ActaEntrega


def generar_pdf_acta(acta):
    html_string = render_to_string('actas/acta_pdf.html', {'acta': acta})
    buffer = BytesIO()
    pisa.CreatePDF(src=html_string, dest=buffer, encoding='utf-8')
    acta.pdf.save(f'acta_{acta.id}.pdf', ContentFile(buffer.getvalue()), save=True)


class ActaEntregaSerializer(serializers.ModelSerializer):
    activo_nombre = serializers.CharField(source='activo.nombre', read_only=True)
    activo_codigo = serializers.CharField(source='activo.codigo_interno', read_only=True)
    persona_nombre = serializers.CharField(source='persona.nombre_completo', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

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
        ]
        read_only_fields = ['pdf', 'generado_por']

    def create(self, validated_data):
        validated_data['generado_por'] = self.context['request'].user
        instance = super().create(validated_data)
        generar_pdf_acta(instance)
        return instance