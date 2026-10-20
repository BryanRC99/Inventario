import re
from django.db import transaction
from rest_framework import serializers

from usuarios.alcance import resolver_empresa_para_crear

from .models import Activo, Categoria, Ubicacion


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'prefijo', 'requiere_custodio_unico']

    def validate_prefijo(self, value):
        return value.strip().upper()


class UbicacionSerializer(serializers.ModelSerializer):
    ubicacion_padre_nombre = serializers.CharField(
        source='ubicacion_padre.nombre', read_only=True, default=None
    )

    class Meta:
        model = Ubicacion
        fields = ['id', 'nombre', 'tipo', 'ubicacion_padre', 'ubicacion_padre_nombre']

    def validate_ubicacion_padre(self, value):
        if self.instance and value and value.id == self.instance.id:
            raise serializers.ValidationError('Una ubicación no puede ser su propio padre.')
        return value


class ActivoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    ubicacion_nombre = serializers.CharField(source='ubicacion.nombre', read_only=True)
    proveedor_nombre = serializers.CharField(
        source='proveedor.nombre', read_only=True, default=None
    )
    area_creador_nombre = serializers.CharField(
        source='area_creador.nombre', read_only=True, default=None
    )
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True, default=None)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = Activo
        fields = [
            'id',
            'codigo_interno',
            'categoria',
            'categoria_nombre',
            'nombre',
            'numero_serie',
            'marca',
            'modelo',
            'fecha_adquisicion',
            'valor_adquisicion',
            'proveedor',
            'proveedor_nombre',
            'fecha_fin_garantia',
            'estado',
            'estado_display',
            'motivo_baja',
            'fecha_baja',
            'ubicacion',
            'ubicacion_nombre',
            'especificaciones',
            'area_creador',
            'area_creador_nombre',
            'empresa',
            'empresa_nombre',
            'creado_por',
            'fecha_creacion',
        ]
        read_only_fields = [
            'codigo_interno',
            'creado_por',
            'fecha_creacion',
            'motivo_baja',
            'fecha_baja',
            'area_creador',
        ]

    def generar_codigo_interno(self, categoria):
        prefijo = categoria.prefijo
        patron = re.compile(rf'^{re.escape(prefijo)}-(\d+)$')
        codigos = Activo.objects.filter(
            codigo_interno__startswith=f'{prefijo}-'
        ).values_list('codigo_interno', flat=True)
        numeros = [int(m.group(1)) for c in codigos if (m := patron.match(c))]
        return f'{prefijo}-{max(numeros, default=0) + 1:03d}'

    @transaction.atomic
    def create(self, validated_data):
        from trazabilidad.utils import registrar_movimiento

        usuario = self.context['request'].user
        validated_data['creado_por'] = usuario
        validated_data['area_creador'] = usuario.area

        validated_data['empresa'] = resolver_empresa_para_crear(usuario, validated_data.get('empresa'))

        # Bloquea la fila de la categoría: dos creaciones simultáneas
        # de la misma categoría se ponen en fila y no repiten código.
        categoria = Categoria.objects.select_for_update().get(pk=validated_data['categoria'].pk)
        validated_data['codigo_interno'] = self.generar_codigo_interno(categoria)

        activo = super().create(validated_data)

        registrar_movimiento(
            activo=activo,
            tipo_evento='creacion',
            usuario=usuario,
            ubicacion_destino=activo.ubicacion,
            observaciones='Registro inicial del activo en el sistema.',
        )

        return activo

    def update(self, instance, validated_data):
        usuario = self.context['request'].user
        if not (usuario.is_superuser or usuario.rol == 'admin'):
            # Un no-Admin no puede cambiar la empresa de un activo.
            validated_data.pop('empresa', None)
        return super().update(instance, validated_data)