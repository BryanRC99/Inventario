import uuid

from django.db import models


class Area(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)
    ubicacion = models.ForeignKey(
        'inventario.Ubicacion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='areas',
        help_text='Ubicación física por defecto de esta área. Se usa para actualizar automáticamente dónde está un activo al asignarlo a alguien de esta área.',
    )

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Área'
        verbose_name_plural = 'Áreas'

    def __str__(self):
        return self.nombre