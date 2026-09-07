from rest_framework import serializers

from .models import Area


class AreaSerializer(serializers.ModelSerializer):
    ubicacion_nombre = serializers.CharField(
        source='ubicacion.nombre', read_only=True, default=None
    )

    class Meta:
        model = Area
        fields = ['id', 'nombre', 'descripcion', 'ubicacion', 'ubicacion_nombre']