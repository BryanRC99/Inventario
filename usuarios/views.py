from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario
from .permissions import SoloAdmin
from .serializers import (
    CambiarPasswordSerializer,
    CustomTokenObtainPairSerializer,
    PerfilSerializer,
    UsuarioCreateSerializer,
    UsuarioListaSerializer,
    UsuarioSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    """
    GET   /api/auth/me/  -> perfil del usuario autenticado
    PATCH /api/auth/me/  -> edita SU PROPIO nombre/apellido/email
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = PerfilSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CambiarPasswordView(APIView):
    """POST /api/auth/cambiar-password/ -> { password_actual, password_nueva }"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CambiarPasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data['password_nueva'])
        request.user.save()

        return Response({'detail': 'Contraseña actualizada correctamente.'}, status=status.HTTP_200_OK)


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by('username')
    permission_classes = [SoloAdmin]
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        return UsuarioListaSerializer


class LogoutView(APIView):
    """Revoca el token de renovación y registra el cierre de sesión."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import RefreshToken

        from auditoria.utils import registrar_auditoria

        refresh_value = request.data.get('refresh')
        if not refresh_value:
            return Response({'detail': 'Sesión cerrada.'})

        try:
            refresh = RefreshToken(refresh_value)
            usuario = Usuario.objects.filter(pk=refresh['user_id']).first()
            refresh.blacklist()
        except (TokenError, TypeError, ValueError):
            return Response({'detail': 'Sesión cerrada.'})

        if usuario:
            registrar_auditoria(
                accion='logout',
                modelo='Usuario',
                objeto_id=usuario.id,
                objeto_repr=usuario.username,
                usuario=usuario,
            )
        return Response({'detail': 'Sesión cerrada.'})
