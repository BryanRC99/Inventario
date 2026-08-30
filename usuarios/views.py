from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import CustomTokenObtainPairSerializer, UsuarioSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/auth/login/
    body: { "username": "...", "password": "..." }
    Devuelve access, refresh, y datos básicos del usuario.
    """
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    """
    GET /api/auth/me/
    Devuelve el perfil del usuario autenticado actualmente
    (útil para que el frontend valide la sesión al recargar la página).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)