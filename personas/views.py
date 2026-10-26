from rest_framework import viewsets

from usuarios.permissions import PermisoPorRolSinConsulta

from .models import Persona
from .scoping import personas_visibles
from .serializers import PersonaSerializer


class PersonaViewSet(viewsets.ModelViewSet):
    serializer_class = PersonaSerializer
    permission_classes = [PermisoPorRolSinConsulta]

    def get_queryset(self):
        base = Persona.objects.select_related('area', 'empresa')
        return personas_visibles(self.request.user, base)

    def perform_destroy(self, instance):
        usuario = instance.usuario
        super().perform_destroy(instance)   
        if usuario:
            usuario.is_active = False
            usuario.save(update_fields=['is_active'])

       
            

