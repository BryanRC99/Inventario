from rest_framework import serializers

from usuarios.models import Usuario
from usuarios.utils import generar_password_aleatoria

from .models import Persona


class PersonaSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)
    area_nombre = serializers.CharField(source='area.nombre', read_only=True, default=None)
    tiene_acceso_consulta = serializers.SerializerMethodField()
    crear_acceso_consulta = serializers.BooleanField(write_only=True, required=False, default=False)

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
            'tiene_acceso_consulta',
            'crear_acceso_consulta',
        ]

    def get_tiene_acceso_consulta(self, obj):
        return obj.usuario_id is not None

    def create(self, validated_data):
        crear_acceso = validated_data.pop('crear_acceso_consulta', False)
        persona = super().create(validated_data)

        if crear_acceso:
            password_generada = self._crear_usuario_consulta(persona)
            persona._password_generada = password_generada

        return persona

    def _crear_usuario_consulta(self, persona):
        if Usuario.objects.filter(username=persona.documento).exists():
            raise serializers.ValidationError(
                {'crear_acceso_consulta': 'Ya existe un usuario con ese número de documento.'}
            )

        password = generar_password_aleatoria()
        usuario = Usuario(
            username=persona.documento,
            first_name=persona.nombres,
            last_name=persona.apellidos,
            email=persona.email,
            rol='consulta',
            area=persona.area,
        )
        usuario.set_password(password)
        usuario.save()

        persona.usuario = usuario
        persona.save(update_fields=['usuario'])

        return password

    def to_representation(self, instance):
        data = super().to_representation(instance)
        password_generada = getattr(instance, '_password_generada', None)
        if password_generada:
            data['password_generada'] = password_generada
        return data