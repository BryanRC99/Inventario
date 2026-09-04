import uuid

from django.db import models


class Persona(models.Model):
    """
    Custodio de un activo. No necesariamente tiene una cuenta de acceso
    al sistema (eso es 'Usuario', en la app 'usuarios') — es simplemente
    alguien a quien se le puede asignar la responsabilidad de un equipo.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    documento = models.CharField(max_length=20, unique=True)
    cargo = models.CharField(max_length=100, blank=True)
    area = models.ForeignKey(
      'areas.Area', on_delete=models.SET_NULL, null=True, blank=True, related_name='personas'
    )
    email = models.EmailField(blank=True)

    class Meta:
        ordering = ['apellidos', 'nombres']
        verbose_name = 'Persona'
        verbose_name_plural = 'Personas'

    @property
    def nombre_completo(self):
        return f'{self.nombres} {self.apellidos}'.strip()

    def __str__(self):
        return self.nombre_completo