import uuid

from django.conf import settings
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

    def _str_(self):
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

    def _str_(self):
        return self.nombre


class Activo(models.Model):
    class Estado(models.TextChoices):
        ACTIVO = 'activo', 'Activo'
        EN_MANTENIMIENTO = 'en_mantenimiento', 'En mantenimiento'
        DADO_DE_BAJA = 'dado_de_baja', 'Dado de baja'
        EXTRAVIADO = 'extraviado', 'Extraviado'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo_interno = models.CharField(max_length=30, unique=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='activos')
    nombre = models.CharField(max_length=150)
    numero_serie = models.CharField(max_length=100, blank=True)
    marca = models.CharField(max_length=100, blank=True)
    modelo = models.CharField(max_length=100, blank=True)
    fecha_adquisicion = models.DateField(null=True, blank=True)
    valor_adquisicion = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    proveedor = models.ForeignKey(
        'proveedores.Proveedor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activos',
    )
    fecha_fin_garantia = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO)
    ubicacion = models.ForeignKey(Ubicacion, on_delete=models.PROTECT, related_name='activos')
    especificaciones = models.JSONField(null=True, blank=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activos_creados',
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_creacion']
        verbose_name = 'Activo'
        verbose_name_plural = 'Activos'

    def _str_(self):
        return f'{self.codigo_interno} - {self.nombre}'