from rest_framework import serializers

from .models import Categoria, Ubicacion


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