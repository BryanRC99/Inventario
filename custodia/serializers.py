from rest_framework import serializers
from inventario.models import Ubicacion

from .models import Custodia
import copy

class CustodiaSerializer(serializers.ModelSerializer):
    activo_nombre = serializers.CharField(source='activo.nombre', read_only=True)
    activo_codigo = serializers.CharField(source='activo.codigo_interno', read_only=True)
    persona_nombre = serializers.CharField(
        source='persona.nombre_completo', read_only=True, default=None
    )
    area_nombre = serializers.CharField(source='area.nombre', read_only=True, default=None)
    activa = serializers.SerializerMethodField()
    ubicacion_destino = serializers.PrimaryKeyRelatedField(
        queryset=Ubicacion.objects.all(), write_only=True, required=False
    )

    class Meta:
        model = Custodia
        fields = [
            'id',
            'activo',
            'activo_nombre',
            'activo_codigo',
            'persona',
            'persona_nombre',
            'area',
            'area_nombre',
            'fecha_inicio',
            'fecha_fin',
            'tipo',
            'activa',
            'ubicacion_destino',
        ]

    def get_activa(self, obj):
        return obj.fecha_fin is None


    def validate(self, attrs):
      if self.instance:
        instance = copy.copy(self.instance)
        for attr, value in attrs.items():
            setattr(instance, attr, value)
      else:
        instance = Custodia(**attrs)

      instance.clean()
      return attrs

    def create(self, validated_data):
        from trazabilidad.utils import registrar_movimiento

        custodia = super().create(validated_data)
        activo = custodia.activo

        # Determina la ubicación por defecto del área del custodio
        # (ya sea directamente el área, o el área de la persona).
        area_referencia = custodia.area or (custodia.persona.area if custodia.persona else None)
        nueva_ubicacion = area_referencia.ubicacion if area_referencia else None

        titular = custodia.persona.nombre_completo if custodia.persona else custodia.area.nombre

        if nueva_ubicacion and nueva_ubicacion != activo.ubicacion:
            ubicacion_anterior = activo.ubicacion
            activo.ubicacion = nueva_ubicacion
            activo.save(update_fields=['ubicacion'])

            registrar_movimiento(
                activo=activo,
                tipo_evento='asignacion',
                usuario=self.context['request'].user,
                ubicacion_origen=ubicacion_anterior,
                ubicacion_destino=nueva_ubicacion,
                observaciones=f'Custodia asignada a {titular}. Ubicación actualizada automáticamente.',
            )
        else:
            registrar_movimiento(
                activo=activo,
                tipo_evento='asignacion',
                usuario=self.context['request'].user,
                observaciones=f'Custodia asignada a {titular}.',
            )

        return custodia

    def update(self, instance, validated_data):
        from trazabilidad.utils import registrar_movimiento

        # 'ubicacion_destino' no es un campo del modelo Custodia, así que
        # lo sacamos antes de que super().update() intente guardarlo.
        ubicacion_destino = validated_data.pop('ubicacion_destino', None)

        tenia_fecha_fin_antes = instance.fecha_fin is not None
        custodia = super().update(instance, validated_data)

        if not tenia_fecha_fin_antes and custodia.fecha_fin is not None:
            titular = (
                custodia.persona.nombre_completo if custodia.persona else custodia.area.nombre
            )
            activo = custodia.activo
            ubicacion_anterior = activo.ubicacion

            if ubicacion_destino and ubicacion_destino != activo.ubicacion:
                activo.ubicacion = ubicacion_destino
                activo.save(update_fields=['ubicacion'])

            registrar_movimiento(
                activo=activo,
                tipo_evento='devolucion',
                usuario=self.context['request'].user,
                ubicacion_origen=ubicacion_anterior,
                ubicacion_destino=ubicacion_destino or ubicacion_anterior,
                observaciones=f'Custodia finalizada, devuelto por {titular}.',
            )

        return custodia