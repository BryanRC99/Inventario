import uuid

from django.db import models


class Categoria(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100, unique=True)
    requiere_custodio_unico = models.BooleanField(
        default=True,
        help_text='Si está desactivado, este tipo de activo puede tener varios custodios a la vez (ej. proyector de sala).',
    )

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'

    def __str__(self):
        return self.nombre