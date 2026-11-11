from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('actas', '0003_escaneos'),
    ]

    operations = [
        migrations.AddField(
            model_name='actaentrega',
            name='entregado_por_nombre',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        migrations.AddField(
            model_name='actaentrega',
            name='recibido_por_nombre',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
    ]
