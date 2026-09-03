from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario
from .permissions import SoloAdmin
from .serializers import (
    CustomTokenObtainPairSerializer,
    UsuarioCreateSerializer,
    UsuarioListaSerializer,
    UsuarioSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD de usuarios del sistema. Solo accesible por Admin.
    GET    /api/auth/usuarios/          -> listar
    POST   /api/auth/usuarios/          -> crear (con contraseña)
    PATCH  /api/auth/usuarios/{id}/     -> editar (rol, activo, etc.)
    DELETE /api/auth/usuarios/{id}/     -> borrar
    """

    queryset = Usuario.objects.all().order_by('username')
    permission_classes = [SoloAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        return UsuarioListaSerializer