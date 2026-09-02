from rest_framework import serializers

from .models import Custodia
import copy

class CustodiaSerializer(serializers.ModelSerializer):
    activo_nombre = serializers.CharField(source='activo.nombre', read_only=True)
    activo_codigo = serializers.CharField(source='activo.codigo_interno', read_only=True)
    persona_nombre = serializers.CharField(
        source='persona.nombre_completo', read_only=True, default=None
    )
    activa = serializers.SerializerMethodField()

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
            'fecha_inicio',
            'fecha_fin',
            'tipo',
            'activa',
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

        titular = custodia.persona.nombre_completo if custodia.persona else custodia.area
        registrar_movimiento(
            activo=custodia.activo,
            tipo_evento='asignacion',
            usuario=self.context['request'].user,
            observaciones=f'Custodia asignada a {titular}.',
        )

        return custodia

    def update(self, instance, validated_data):
        from trazabilidad.utils import registrar_movimiento

        tenia_fecha_fin_antes = instance.fecha_fin is not None
        custodia = super().update(instance, validated_data)

        if not tenia_fecha_fin_antes and custodia.fecha_fin is not None:
            titular = custodia.persona.nombre_completo if custodia.persona else custodia.area
            registrar_movimiento(
                activo=custodia.activo,
                tipo_evento='devolucion',
                usuario=self.context['request'].user,
                observaciones=f'Custodia finalizada, devuelto por {titular}.',
            )

        return custodia