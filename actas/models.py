import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

from .almacenamiento import almacen_privado


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


class ActaEscaneo(models.Model):
    """Copia escaneada (o fotografiada) del acta firmada. Un acta puede tener varios
    archivos (páginas, fotos). Nunca se borran de forma definitiva desde el sistema:
    "eliminar" solo los oculta y queda registro de quién y por qué."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    acta = models.ForeignKey(ActaEntrega, on_delete=models.PROTECT, related_name='escaneos')
    archivo = models.FileField(
        storage=almacen_privado,
        upload_to='actas_escaneadas/%Y/%m/',
        max_length=255,
        help_text='Se guarda con un nombre aleatorio, fuera de la carpeta pública.',
    )
    nombre_original = models.CharField(max_length=150)
    tipo_contenido = models.CharField(max_length=50)
    tamano = models.PositiveBigIntegerField()
    sha256 = models.CharField(max_length=64, help_text='Huella para detectar archivos alterados o dañados.')
    subido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='escaneos_subidos',
    )
    fecha_subida = models.DateTimeField(auto_now_add=True)

    eliminado = models.BooleanField(default=False)
    eliminado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='escaneos_eliminados',
    )
    fecha_eliminacion = models.DateTimeField(null=True, blank=True)
    motivo_eliminacion = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['fecha_subida', 'id']
        verbose_name = 'Escaneo de acta'
        verbose_name_plural = 'Escaneos de actas'
        constraints = [
            # El mismo archivo no puede estar dos veces (activo) en la misma acta.
            models.UniqueConstraint(
                fields=['acta', 'sha256'],
                condition=Q(eliminado=False),
                name='escaneo_unico_por_acta',
            ),
        ]

    def __str__(self):
        return f'Escaneo de {self.acta} - {self.nombre_original}'
