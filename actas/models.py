import uuid

from django.conf import settings
from django.db import models


class ActaEntrega(models.Model):
    class Tipo(models.TextChoices):
        ENTREGA = 'entrega', 'Entrega'
        DEVOLUCION = 'devolucion', 'Devolución'
        TRASLADO = 'traslado', 'Traslado'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activo = models.ForeignKey(
        'inventario.Activo', on_delete=models.PROTECT, related_name='actas_entrega'
    )
    persona = models.ForeignKey(
        'personas.Persona', on_delete=models.PROTECT, related_name='actas_entrega'
    )
    custodia = models.ForeignKey(
        'custodia.Custodia',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='actas_entrega',
        help_text='Custodia que originó esta acta, si aplica.',
    )
    fecha = models.DateField()
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    firma = models.TextField(
        blank=True,
        help_text='Firma capturada en pantalla, guardada como imagen en base64.',
    )
    pdf = models.FileField(upload_to='actas/', null=True, blank=True)
    observaciones = models.TextField(blank=True)
    generado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='actas_generadas',
    )

    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Acta de entrega'
        verbose_name_plural = 'Actas de entrega'

    def __str__(self):
        return f'{self.get_tipo_display()} - {self.activo.codigo_interno} - {self.persona.nombre_completo}'