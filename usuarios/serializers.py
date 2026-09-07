from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Usuario


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extiende el serializer de login estándar para incluir datos
    útiles del usuario directamente en el token (evita que el
    frontend tenga que hacer una segunda llamada solo para saber
    el rol o el nombre apenas loguea).
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['rol'] = user.rol
        token['nombre_completo'] = f"{user.first_name} {user.last_name}".strip()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['usuario'] = {
            'id': str(self.user.id),
            'username': self.user.username,
            'rol': self.user.rol,
            'nombre_completo': f"{self.user.first_name} {self.user.last_name}".strip(),
        }
        return data


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'rol']
        read_only_fields = ['id', 'rol']

class UsuarioListaSerializer(serializers.ModelSerializer):
    """Para listar/editar usuarios desde el panel de Administración."""

    nombre_completo = serializers.SerializerMethodField()
    area_nombre = serializers.CharField(source='area.nombre', read_only=True, default=None)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'nombre_completo',
            'email',
            'rol',
            'area',
            'area_nombre',
            'is_active',
            'date_joined',
        ]
        read_only_fields = ['date_joined']

    def get_nombre_completo(self, obj):
        return f'{obj.first_name} {obj.last_name}'.strip() or obj.username


class UsuarioCreateSerializer(serializers.ModelSerializer):
    """Para crear un usuario nuevo desde el panel de Administración.
    La contraseña se genera automáticamente y se devuelve UNA VEZ en la
    respuesta (ver to_representation) para que el Admin la copie."""

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'rol', 'area']

    def create(self, validated_data):
        from .utils import generar_password_aleatoria

        password = generar_password_aleatoria()
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        usuario._password_generada = password
        return usuario

    def to_representation(self, instance):
        data = super().to_representation(instance)
        password_generada = getattr(instance, '_password_generada', None)
        if password_generada:
            data['password_generada'] = password_generada
        return data

class PerfilSerializer(serializers.ModelSerializer):
    """Para que el propio usuario edite SU perfil. Deliberadamente no
    incluye username, rol, area ni is_active — esos solo los cambia Admin
    desde el módulo de Usuarios."""

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'rol']
        read_only_fields = ['id', 'username', 'rol']


class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    password_nueva = serializers.CharField(write_only=True, min_length=8)

    def validate_password_actual(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('La contraseña actual no es correcta.')
        return value