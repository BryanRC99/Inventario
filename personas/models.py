import uuid

from django.db import models


class Persona(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    documento = models.CharField(max_length=20, unique=True)
    cargo = models.CharField(max_length=100, blank=True)
    area = models.ForeignKey(
        'areas.Area', on_delete=models.SET_NULL, null=True, blank=True, related_name='personas'
    )
    email = models.EmailField(blank=True)
    usuario = models.OneToOneField(
        'usuarios.Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='persona_vinculada',
        help_text='Cuenta de acceso de solo consulta vinculada a esta persona, si la tiene.',
    )

    class Meta:
        ordering = ['apellidos', 'nombres']
        verbose_name = 'Persona'
        verbose_name_plural = 'Personas'

    @property
    def nombre_completo(self):
        return f'{self.nombres} {self.apellidos}'.strip()

    def __str__(self):
        return self.nombre_completo