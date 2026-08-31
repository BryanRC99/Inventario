import uuid

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models


def validar_ruc_ecuador(value):

    if not value.isdigit():
        raise ValidationError('El RUC debe contener únicamente números.')

    if len(value) != 13:
        raise ValidationError('El RUC debe tener exactamente 13 dígitos.')

    if value[-3:] != '001':
        raise ValidationError('El RUC debe terminar en 001.')

    cedula = value[:10]
    provincia = int(cedula[:2])

    if provincia < 1 or provincia > 24:
        raise ValidationError('El código de provincia del RUC no es válido.')

    tercer_digito = int(cedula[2])

    # RUC de persona natural
    if tercer_digito < 6:
        coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2]
        suma = 0

        for digito, coeficiente in zip(cedula[:9], coeficientes):
            resultado = int(digito) * coeficiente

            if resultado >= 10:
                resultado -= 9

            suma += resultado

        digito_verificador = (10 - (suma % 10)) % 10

        if digito_verificador != int(cedula[9]):
            raise ValidationError('El RUC no es válido.')

    # RUC de sociedad privada
    elif tercer_digito == 9:
        coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2]
        suma = sum(
            int(digito) * coeficiente
            for digito, coeficiente in zip(cedula[:9], coeficientes)
        )

        residuo = suma % 11
        digito_verificador = 11 - residuo if residuo else 0

        if digito_verificador != int(cedula[9]):
            raise ValidationError('El RUC no es válido.')

    # RUC de sociedad pública
    elif tercer_digito == 6:
        coeficientes = [3, 2, 7, 6, 5, 4, 3, 2]
        suma = sum(
            int(digito) * coeficiente
            for digito, coeficiente in zip(cedula[:8], coeficientes)
        )

        residuo = suma % 11
        digito_verificador = 11 - residuo if residuo else 0

        if digito_verificador != int(cedula[8]):
            raise ValidationError('El RUC no es válido.')

    else:
        raise ValidationError('El RUC no corresponde a un tipo válido de contribuyente.')


class Proveedor(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    nombre = models.CharField(
        max_length=150,
        unique=True,
    )

    ruc = models.CharField(
        max_length=13,
        unique=True,
        validators=[validar_ruc_ecuador],
        help_text='RUC ecuatoriano de 13 dígitos.',
    )

    contacto = models.CharField(
        max_length=150,
    )

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'

    def clean(self):
        super().clean()

        self.nombre = self.nombre.strip()
        self.ruc = self.ruc.strip()
        self.contacto = self.contacto.strip()

    def __str__(self):
        return self.nombre
