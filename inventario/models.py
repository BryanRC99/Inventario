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

class Ubicacion(models.Model):
    class Tipo(models.TextChoices):
        SEDE = 'sede', 'Sede'
        PISO = 'piso', 'Piso'
        OFICINA = 'oficina', 'Oficina'
        BODEGA = 'bodega', 'Bodega'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=150)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    ubicacion_padre = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='sub_ubicaciones',
        help_text='Ej. una oficina pertenece a un piso, un piso pertenece a una sede.',
    )

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Ubicación'
        verbose_name_plural = 'Ubicaciones'

    def __str__(self):
        return self.nombre