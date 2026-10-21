import uuid

from django.conf import settings
from django.conf import settings as dj_settings
from django.core.files.storage import FileSystemStorage
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


def almacen_privado():
    """Almacenamiento fuera de MEDIA_ROOT y sin URL pública (callable: la ruta se lee de settings al usarse)."""
    return FileSystemStorage(location=dj_settings.PRIVATE_MEDIA_ROOT, base_url=None)


EXTENSION_POR_TIPO = {'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png'}


def ruta_escaneo(instance, filename):
    # Nombre aleatorio y extensión según el contenido real: no se conserva nada del nombre original.
    from django.utils import timezone

    hoy = timezone.now()
    return f'actas_escaneadas/{hoy:%Y}/{hoy:%m}/{uuid.uuid4().hex}{EXTENSION_POR_TIPO.get(instance.tipo_contenido, ".bin")}'


class ActaEscaneo(models.Model):
    """Archivo escaneado (o foto) del acta firmada: respaldo digital del documento físico."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    acta = models.ForeignKey(ActaEntrega, on_delete=models.PROTECT, related_name='escaneos')
    archivo = models.FileField(upload_to=ruta_escaneo, storage=almacen_privado, max_length=255)
    nombre_original = models.CharField(max_length=255)
    tipo_contenido = models.CharField(max_length=50)
    tamano = models.PositiveBigIntegerField(help_text='Tamaño en bytes.')
    sha256 = models.CharField(max_length=64, help_text='Huella del archivo para detectar alteraciones o pérdida.')
    subido_por = models.ForeignKey(
        dj_settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='escaneos_subidos'
    )
    fecha_subida = models.DateTimeField(auto_now_add=True)
    # Borrado lógico: el archivo NO se borra del disco, solo se oculta.
    eliminado = models.BooleanField(default=False)
    eliminado_por = models.ForeignKey(
        dj_settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='escaneos_eliminados'
    )
    fecha_eliminacion = models.DateTimeField(null=True, blank=True)
    motivo_eliminacion = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['fecha_subida']
        verbose_name = 'Escaneo de acta'
        verbose_name_plural = 'Escaneos de actas'

    def __str__(self):
        return f'Escaneo de {self.acta} ({self.nombre_original})'
