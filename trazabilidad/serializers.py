from rest_framework import serializers

from .models import Mantenimiento, Movimiento


class MovimientoSerializer(serializers.ModelSerializer):
    activo_nombre = serializers.CharField(source='activo.nombre', read_only=True)
    activo_codigo = serializers.CharField(source='activo.codigo_interno', read_only=True)
    tipo_evento_display = serializers.CharField(source='get_tipo_evento_display', read_only=True)
    usuario_username = serializers.CharField(source='usuario.username', read_only=True, default=None)
    ubicacion_origen_nombre = serializers.CharField(
        source='ubicacion_origen.nombre', read_only=True, default=None
    )
    ubicacion_destino_nombre = serializers.CharField(
        source='ubicacion_destino.nombre', read_only=True, default=None
    )

    class Meta:
        model = Movimiento
        fields = [
            'id',
            'activo',
            'activo_nombre',
            'activo_codigo',
            'tipo_evento',
            'tipo_evento_display',
            'usuario',
            'usuario_username',
            'fecha_hora',
            'ubicacion_origen',
            'ubicacion_origen_nombre',
            'ubicacion_destino',
            'ubicacion_destino_nombre',
            'observaciones',
        ]
        read_only_fields = ['usuario', 'fecha_hora']

    def create(self, validated_data):
        validated_data['usuario'] = self.context['request'].user
        return super().create(validated_data)


class MantenimientoSerializer(serializers.ModelSerializer):
    activo_nombre = serializers.CharField(source='activo.nombre', read_only=True)
    activo_codigo = serializers.CharField(source='activo.codigo_interno', read_only=True)
    proveedor_nombre = serializers.CharField(
        source='proveedor.nombre', read_only=True, default=None
    )

    class Meta:
        model = Mantenimiento
        fields = [
            'id',
            'activo',
            'activo_nombre',
            'activo_codigo',
            'proveedor',
            'proveedor_nombre',
            'fecha',
            'costo',
            'descripcion_problema',
            'repuestos_usados',
            'proxima_fecha_programada',
        ]

    def create(self, validated_data):
        from .utils import registrar_movimiento

        mantenimiento = super().create(validated_data)

        registrar_movimiento(
            activo=mantenimiento.activo,
            tipo_evento='mantenimiento',
            usuario=self.context['request'].user,
            observaciones=mantenimiento.descripcion_problema[:200],
        )

        return mantenimiento