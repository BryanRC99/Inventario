from rest_framework import viewsets

from usuarios.permissions import PermisoPorRol

from .models import Persona
from .serializers import PersonaSerializer


class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.all()
    serializer_class = PersonaSerializer
    permission_classes = [PermisoPorRol]