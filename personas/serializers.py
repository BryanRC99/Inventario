from rest_framework import serializers

from .models import Persona


class PersonaSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)
    area_nombre = serializers.CharField(source='area.nombre', read_only=True, default=None)

    class Meta:
        model = Persona
        fields = [
            'id',
            'nombres',
            'apellidos',
            'nombre_completo',
            'documento',
            'cargo',
            'area',
            'area_nombre',
            'email',
        ]