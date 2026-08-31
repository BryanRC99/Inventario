from rest_framework import serializers

from .models import Activo, Categoria, Ubicacion


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'requiere_custodio_unico']


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
            'ubicacion',
            'ubicacion_nombre',
            'especificaciones',
            'creado_por',
            'fecha_creacion',
        ]
        read_only_fields = ['creado_por', 'fecha_creacion']

    def create(self, validated_data):
        validated_data['creado_por'] = self.context['request'].user
        return super().create(validated_data)