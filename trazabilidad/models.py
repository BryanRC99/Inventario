import uuid

from django.conf import settings
from django.db import models


class Movimiento(models.Model):
    class TipoEvento(models.TextChoices):
        CREACION = 'creacion', 'Creación'
        ASIGNACION = 'asignacion', 'Asignación'
        DEVOLUCION = 'devolucion', 'Devolución'
        TRASLADO = 'traslado', 'Traslado'
        MANTENIMIENTO = 'mantenimiento', 'Mantenimiento'
        BAJA = 'baja', 'Baja'
        ESCANEO_VALIDACION = 'escaneo_validacion', 'Escaneo de validación'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activo = models.ForeignKey(
        'inventario.Activo', on_delete=models.CASCADE, related_name='movimientos'
    )
    tipo_evento = models.CharField(max_length=30, choices=TipoEvento.choices)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_registrados',
    )
    fecha_hora = models.DateTimeField(auto_now_add=True)
    ubicacion_origen = models.ForeignKey(
        'inventario.Ubicacion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_como_origen',
    )
    ubicacion_destino = models.ForeignKey(
        'inventario.Ubicacion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_como_destino',
    )
    observaciones = models.TextField(blank=True)

    class Meta:
        ordering = ['-fecha_hora']
        verbose_name = 'Movimiento'
        verbose_name_plural = 'Movimientos'

    def __str__(self):
        return f'{self.get_tipo_evento_display()} - {self.activo.codigo_interno}'


class Mantenimiento(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activo = models.ForeignKey(
        'inventario.Activo', on_delete=models.CASCADE, related_name='mantenimientos'
    )
    proveedor = models.ForeignKey(
        'proveedores.Proveedor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mantenimientos',
    )
    fecha = models.DateField()
    costo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    descripcion_problema = models.TextField()
    repuestos_usados = models.TextField(blank=True)
    proxima_fecha_programada = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Mantenimiento'
        verbose_name_plural = 'Mantenimientos'

    def __str__(self):
        return f'{self.activo.codigo_interno} - {self.fecha}'