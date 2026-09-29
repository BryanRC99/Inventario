import uuid

from django.db import models


class Empresa(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=150, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'

    def __str__(self):
        return self.nombre