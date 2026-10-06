import uuid

from django.db import models


class Empresa(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=150, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)
    logo_filename = models.CharField(
        max_length=255,
        blank=True,
        help_text=(
            'Opcional. El sistema ya detecta el logo automáticamente buscando '
            '"logo_<nombre_empresa>.png" en la carpeta static/. Solo llena este campo '
            'si necesitas usar un nombre de archivo distinto al de esa convención.'
        ),
    )

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'

    def __str__(self):
        return self.nombre