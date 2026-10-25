import csv
import hashlib
import io
import os
from datetime import datetime
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from actas.almacenamiento import almacen_privado
from actas.models import ActaEscaneo


class Command(BaseCommand):
    help = (
        'Genera un .zip con TODOS los escaneos de actas (incluidos los eliminados) y un '
        'manifiesto.csv con sus datos y huellas, recuperable aunque se pierda la base de datos. '
        'Copia luego ese .zip a otro disco o equipo.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--destino', default=None,
                            help='Carpeta donde dejar el .zip (por defecto, RESPALDOS_ROOT).')
        parser.add_argument('--mantener', type=int, default=14,
                            help='Cuántos respaldos conservar en la carpeta (0 = todos). Por defecto 14.')

    def handle(self, *args, **opciones):
        destino = Path(opciones['destino'] or settings.RESPALDOS_ROOT)
        destino.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(destino, 0o700)
        except OSError:
            pass

        marca = datetime.now().strftime('%Y%m%d_%H%M%S')
        final = destino / f'respaldo_actas_{marca}.zip'
        temporal = destino / f'.respaldo_actas_{marca}.zip.tmp'

        manifiesto = io.StringIO()
        escritor = csv.writer(manifiesto)
        escritor.writerow(['estado', 'acta_id', 'escaneo_id', 'ruta_en_zip', 'nombre_original', 'tipo',
                           'tamano', 'sha256', 'subido_por', 'fecha_subida', 'eliminado', 'motivo_eliminacion'])
        problemas = 0
        total = 0

        try:
            with ZipFile(temporal, 'w', compression=ZIP_STORED, allowZip64=True) as zf:
                consulta = ActaEscaneo.objects.select_related('subido_por').order_by('fecha_subida')
                for e in consulta.iterator():
                    total += 1
                    nombre = e.archivo.name
                    ruta_zip = f'archivos/{nombre}'
                    estado = 'ok'
                    if not almacen_privado.exists(nombre):
                        estado, problemas = 'FALTANTE', problemas + 1
                        self.stderr.write(self.style.ERROR(f'FALTA {e.nombre_original} ({e.id})'))
                    else:
                        sha = hashlib.sha256()
                        with almacen_privado.open(nombre, 'rb') as origen, zf.open(ruta_zip, 'w', force_zip64=True) as dest:
                            for bloque in iter(lambda: origen.read(1024 * 1024), b''):
                                sha.update(bloque)
                                dest.write(bloque)
                        if sha.hexdigest() != e.sha256:
                            estado, problemas = 'ALTERADO', problemas + 1
                            self.stderr.write(self.style.ERROR(f'ALTERADO {e.nombre_original} ({e.id})'))
                    escritor.writerow([
                        estado, e.acta_id, e.id, ruta_zip if estado != 'FALTANTE' else '', e.nombre_original,
                        e.tipo_contenido, e.tamano, e.sha256,
                        e.subido_por.username if e.subido_por else '', e.fecha_subida.isoformat(),
                        e.eliminado, e.motivo_eliminacion,
                    ])
                zf.writestr('manifiesto.csv', '﻿' + manifiesto.getvalue())  # BOM: Excel abre bien los acentos
            os.chmod(temporal, 0o600)
            os.replace(temporal, final)  # el .zip aparece completo o no aparece
        except Exception:
            temporal.unlink(missing_ok=True)
            raise

        mantener = opciones['mantener']
        if mantener > 0:
            for viejo in sorted(destino.glob('respaldo_actas_*.zip'))[:-mantener]:
                viejo.unlink(missing_ok=True)

        self.stdout.write(self.style.SUCCESS(f'Respaldo creado: {final} ({total} archivo(s)).'))
        self.stdout.write('Recuerda copiarlo a otro disco o equipo: un respaldo en el mismo servidor no protege contra su pérdida.')
        if problemas:
            raise CommandError(f'El respaldo se creó, pero {problemas} archivo(s) faltan o están alterados: revisa los mensajes.')
