from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from empresas.models import Empresa

from .models import Usuario


def empresas_del_usuario_data(user):
    """Empresas que puede gestionar el usuario, para que el frontend arme sus selectores."""
    from empresas.models import Empresa

    from .alcance import empresas_ids

    ids = empresas_ids(user)
    qs = Empresa.objects.all() if ids is None else Empresa.objects.filter(pk__in=ids)
    return [{'id': str(e.id), 'nombre': e.nombre} for e in qs.order_by('nombre')]


class AlcanceEmpresasMixin:
    """Validación y guardado de empresa principal + empresas adicionales + alcance."""

    def validate(self, attrs):
        attrs = super().validate(attrs)
        inst = getattr(self, 'instance', None)
        rol = attrs.get('rol', inst.rol if inst else Usuario.Rol.OPERADOR)
        empresa = attrs.get('empresa', inst.empresa if inst else None)
        if 'empresas_adicionales' in attrs:
            adicionales = list(attrs['empresas_adicionales'])
        else:
            adicionales = list(inst.empresas_adicionales.all()) if inst else []
        sin_restr = attrs.get('sin_restriccion_area', inst.sin_restriccion_area if inst else False)

        if rol == Usuario.Rol.ADMIN:
            # El administrador ya ve todo: estos campos no aplican.
            attrs['empresas_adicionales'] = []
            attrs['sin_restriccion_area'] = False
            return attrs

        if rol == Usuario.Rol.CONSULTA:
            if adicionales:
                raise serializers.ValidationError(
                    {'empresas_adicionales': 'El rol Consulta solo puede pertenecer a una empresa.'}
                )
            if sin_restr:
                raise serializers.ValidationError(
                    {'sin_restriccion_area': 'Solo un Operador puede tener acceso completo a sus empresas.'}
                )

        if adicionales and not empresa:
            raise serializers.ValidationError(
                {'empresa': 'Elige la empresa principal antes de agregar empresas adicionales.'}
            )
        if empresa:
            # La principal ya cuenta; no se duplica en las adicionales.
            adicionales = [e for e in adicionales if e.pk != empresa.pk]
        attrs['empresas_adicionales'] = adicionales
        return attrs

    def _guardar_alcance(self, usuario, adicionales, antes=None):
        from auditoria.utils import registrar_auditoria

        if adicionales is None:
            return
        usuario.empresas_adicionales.set(adicionales)
        despues = sorted(e.nombre for e in adicionales)
        if antes != despues:
            registrar_auditoria(
                accion='cambio_permisos',
                modelo='Usuario',
                objeto_id=usuario.id,
                objeto_repr=usuario.username,
                cambios={'empresas_adicionales': {'antes': ', '.join(antes or []) or None,
                                                  'despues': ', '.join(despues) or None}},
            )

    def update(self, instance, validated_data):
        adicionales = validated_data.pop('empresas_adicionales', None)
        antes = sorted(e.nombre for e in instance.empresas_adicionales.all())
        with transaction.atomic():
            usuario = super().update(instance, validated_data)
            self._guardar_alcance(usuario, adicionales, antes)
        return usuario


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extiende el serializer de login estándar para incluir datos
    útiles del usuario directamente en el token, y para registrar
    en auditoría tanto los logins exitosos como los fallidos.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['rol'] = user.rol
        token['nombre_completo'] = f"{user.first_name} {user.last_name}".strip()
        return token

    def validate(self, attrs):
        from auditoria.utils import registrar_auditoria

        try:
            data = super().validate(attrs)
        except Exception:
            # Login fallido: guardamos el username que se intentó usar,
            # aunque no exista o la contraseña esté mal, para poder
            # detectar ataques de fuerza bruta despues
            registrar_auditoria(
                accion='login_fallido',
                modelo='Usuario',
                objeto_repr=attrs.get('username', ''),
            )
            raise

        registrar_auditoria(
            accion='login',
            modelo='Usuario',
            objeto_id=self.user.id,
            objeto_repr=self.user.username,
            usuario=self.user,
        )

        data['usuario'] = {
            'id': str(self.user.id),
            'username': self.user.username,
            'rol': self.user.rol,
            'nombre_completo': f"{self.user.first_name} {self.user.last_name}".strip(),
            'empresas': empresas_del_usuario_data(self.user),
        }
        return data

class UsuarioSerializer(serializers.ModelSerializer):
    empresas = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'rol', 'empresas']
        read_only_fields = ['id', 'rol', 'empresas']

    def get_empresas(self, obj):
        return empresas_del_usuario_data(obj)

class UsuarioListaSerializer(AlcanceEmpresasMixin, serializers.ModelSerializer):
    """Para listar/editar usuarios desde el panel de Administración."""

    nombre_completo = serializers.SerializerMethodField()
    area_nombre = serializers.CharField(source='area.nombre', read_only=True, default=None)
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True, default=None)
    empresas_adicionales = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Empresa.objects.all(), required=False
    )
    empresas_adicionales_nombres = serializers.SerializerMethodField()

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
            'empresa',
            'empresa_nombre',
            'empresas_adicionales',
            'empresas_adicionales_nombres',
            'sin_restriccion_area',
            'is_active',
            'date_joined',
        ]
        read_only_fields = ['date_joined']

    def get_empresas_adicionales_nombres(self, obj):
        return [e.nombre for e in obj.empresas_adicionales.all()]

    def get_nombre_completo(self, obj):
        return f'{obj.first_name} {obj.last_name}'.strip() or obj.username


class UsuarioCreateSerializer(AlcanceEmpresasMixin, serializers.ModelSerializer):
    """Para crear un usuario nuevo desde el panel de Administración.
    La contraseña se genera automáticamente y se devuelve UNA VEZ en la
    respuesta (ver to_representation) para que el Admin la copie."""

    empresas_adicionales = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Empresa.objects.all(), required=False
    )

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'rol',
            'area', 'empresa', 'empresas_adicionales', 'sin_restriccion_area',
        ]

    @transaction.atomic
    def create(self, validated_data):
        from .utils import generar_password_aleatoria

        adicionales = validated_data.pop('empresas_adicionales', [])
        password = generar_password_aleatoria()
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        self._guardar_alcance(usuario, adicionales, antes=[])
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