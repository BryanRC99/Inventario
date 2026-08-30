import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """
    Extiende el usuario base de Django agregando 'rol', que usamos
    para controlar permisos en el sistema (admin, operador, consulta).
    Mantenemos username/password/email nativos de Django.
    """

    class Rol(models.TextChoices):
        ADMIN = "admin", "Administrador"
        OPERADOR = "operador", "Operador"
        CONSULTA = "consulta", "Consulta"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.OPERADOR)

    def __str__(self):
        return f"{self.username} ({self.get_rol_display()})"