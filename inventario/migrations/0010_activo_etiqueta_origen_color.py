from django.db import migrations, models
from django.db.models import Q
from django.db.models.functions import Lower


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0009_alter_activo_area_creador_alter_activo_empresa_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='activo',
            name='etiqueta_origen',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='activo',
            name='color',
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddConstraint(
            model_name='activo',
            constraint=models.UniqueConstraint(
                Lower('etiqueta_origen'),
                condition=~Q(etiqueta_origen=''),
                name='uniq_activo_etiqueta_origen_ci',
            ),
        ),
    ]
