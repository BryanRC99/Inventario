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