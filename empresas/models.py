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
            'Nombre exacto del archivo dentro de la carpeta static/ del backend, '
            'ej. logo_empresa_a.png. Si se deja vacío, se usa el logo por defecto del sistema.'
        ),
    )

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'

    def __str__(self):
        return self.nombre