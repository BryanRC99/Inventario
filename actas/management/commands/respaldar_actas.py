import csv
import io
import zipfile
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from actas.models import ActaEscaneo


class Command(BaseCommand):
    help = (
        'Crea un .zip con TODOS los escaneos de actas (incluidos los marcados como eliminados) '
        'y un manifiesto con sus huellas SHA-256. Copie el .zip a otro disco o equipo.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--destino', default=str(Path(settings.BASE_DIR) / 'respaldos'), help='Carpeta donde se crea el .zip.')

    def handle(self, *args, **opts):
        destino = Path(opts['destino'])
        destino.mkdir(parents=True, exist_ok=True)
        zip_path = destino / f'actas_escaneadas_{datetime.now():%Y%m%d_%H%M%S}.zip'

        manifiesto = io.StringIO()
        w = csv.writer(manifiesto)
        w.writerow(['id', 'acta_id', 'archivo', 'nombre_original', 'tipo', 'tamano', 'sha256', 'subido', 'eliminado'])
        copiados = faltantes = 0
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_STORED) as z:
            for esc in ActaEscaneo.objects.iterator():
                try:
                    with esc.archivo.open('rb') as f:
                        z.writestr(esc.archivo.name, f.read())
                    copiados += 1
                except FileNotFoundError:
                    faltantes += 1
                    self.stdout.write(self.style.ERROR(f'FALTA EN DISCO: {esc.archivo.name} ({esc.id})'))
                w.writerow([esc.id, esc.acta_id, esc.archivo.name, esc.nombre_original, esc.tipo_contenido, esc.tamano,
                            esc.sha256, esc.fecha_subida.isoformat(), esc.eliminado])
            z.writestr('MANIFIESTO.csv', manifiesto.getvalue())

        self.stdout.write(self.style.SUCCESS(f'Respaldo creado: {zip_path} ({copiados} archivos)'))
        if faltantes:
            raise CommandError(f'{faltantes} archivo(s) no estaban en disco; el respaldo está incompleto.')
