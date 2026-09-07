from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status, viewsets
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

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        return UsuarioListaSerializer