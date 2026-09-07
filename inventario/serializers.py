from rest_framework import serializers

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
        read_only_fields = ['codigo_interno', 'creado_por', 'fecha_creacion']

    def generar_codigo_interno(self, categoria):
        prefijo = categoria.prefijo
        ultimo = (
            Activo.objects.filter(codigo_interno__startswith=f'{prefijo}-')
            .order_by('-codigo_interno')
            .first()
        )

        if ultimo:
            try:
                ultimo_numero = int(ultimo.codigo_interno.split('-')[-1])
            except ValueError:
                ultimo_numero = 0
        else:
            ultimo_numero = 0

        siguiente_numero = ultimo_numero + 1
        return f'{prefijo}-{siguiente_numero:03d}'

    def create(self, validated_data):
        from trazabilidad.utils import registrar_movimiento

        usuario = self.context['request'].user
        validated_data['creado_por'] = usuario
        validated_data['codigo_interno'] = self.generar_codigo_interno(validated_data['categoria'])

        activo = super().create(validated_data)

        registrar_movimiento(
            activo=activo,
            tipo_evento='creacion',
            usuario=usuario,
            ubicacion_destino=activo.ubicacion,
            observaciones='Registro inicial del activo en el sistema.',
        )

        return activo