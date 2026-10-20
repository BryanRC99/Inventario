import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):

    class Rol(models.TextChoices):
        ADMIN = "admin", "Administrador"
        OPERADOR = "operador", "Operador"
        CONSULTA = "consulta", "Consulta"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.OPERADOR)
    area = models.ForeignKey(
        'areas.Area',
        on_delete=models.PROTECT,  # Cambiado a PROTECT
        null=True,
        blank=True,
        related_name='usuarios',
        help_text='Área/departamento del usuario. Determina qué datos puede ver si no es Admin.',
    )
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.PROTECT,  # Cambiado a PROTECT
        null=True,
        blank=True,
        related_name='usuarios',
        help_text='Empresa a la que pertenece. Determina qué datos puede ver si no es Admin.',
    )

    empresas_adicionales = models.ManyToManyField(
        'empresas.Empresa',
        blank=True,
        related_name='usuarios_con_acceso',
        help_text='Otras empresas que este usuario también administra, además de su empresa principal.',
    )
    sin_restriccion_area = models.BooleanField(
        default=False,
        help_text=(
            'Solo Operador: ve y gestiona todo lo de sus empresas, sin limitarse a lo que creó '
            'o a lo de su área.'
        ),
    )

    def __str__(self):
        return f"{self.username} ({self.get_rol_display()})"