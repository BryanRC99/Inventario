import uuid

from django.core.exceptions import ValidationError
from django.db import models


class Custodia(models.Model):
    class Tipo(models.TextChoices):
        PRINCIPAL = 'principal', 'Principal'
        SECUNDARIO = 'secundario', 'Secundario'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activo = models.ForeignKey(
        'inventario.Activo', on_delete=models.CASCADE, related_name='custodias'
    )
    persona = models.ForeignKey(
        'personas.Persona',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='custodias',
    )
    area = models.ForeignKey(
        'areas.Area',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='custodias',
        help_text='Úsalo en vez de persona cuando el custodio es un área completa, no alguien específico.',
    )
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(
        null=True,
        blank=True,
        help_text='Vacío = custodia activa actualmente.',
    )
    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.PRINCIPAL)

    class Meta:
        ordering = ['-fecha_inicio']
        verbose_name = 'Custodia'
        verbose_name_plural = 'Custodias'

    def clean(self):
        super().clean()

        if not self.persona and not self.area:
            raise ValidationError('Debe indicar una persona o un área como custodio.')

        if self.persona and self.area:
            raise ValidationError('Elige solo persona O área, no ambos a la vez.')

        # La regla central del sistema: si la categoría del activo exige
        # custodio único, no puede haber dos custodias activas (fecha_fin
        # vacía) al mismo tiempo para ese mismo activo.
        if self.activo_id and self.fecha_fin is None:
            categoria = self.activo.categoria
            if categoria.requiere_custodio_unico:
                otras_activas = Custodia.objects.filter(
                    activo=self.activo, fecha_fin__isnull=True
                ).exclude(pk=self.pk)

                if otras_activas.exists():
                    raise ValidationError(
                        f'"{self.activo.nombre}" es de una categoría de custodio único. '
                        'Cierra (pon fecha_fin) la custodia activa actual antes de crear otra.'
                    )

    def __str__(self):
        titular = self.persona.nombre_completo if self.persona else self.area
        return f'{self.activo.codigo_interno} → {titular}'